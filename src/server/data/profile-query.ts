import { profileQuerySchema, queryFields, type ProfileQuery } from "@/lib/profile-query";

export function compileProfileQuery(raw: ProfileQuery) {
  const input = profileQuerySchema.parse(raw);
  const params: (string | number)[] = [];
  const bind = (value: string | number) => { params.push(value); return `$${params.length}`; };
  function condition(expression: string, rule: ProfileQuery["rules"][number], numeric = false) {
    const field = queryFields.find(field => field.key === rule.field)!;
    if (rule.operator === "blank") return `coalesce(${expression}::text, '') = ''`;
    const bound = (value: string) => `${bind(numeric ? Math.round(Number(value) * (field.money === false ? 1 : 100)) : value)}${numeric ? "::numeric" : field.date ? "::date" : "::text"}`;
    const p = bound(rule.value);
    if (field.date) expression = `(${expression})::date`;
    if (rule.operator === "between") return `${expression} between ${p} and ${bound(rule.valueTo!)}`;
    if (numeric || field.date) return `${expression} ${rule.operator === "gte" ? ">=" : rule.operator === "lte" ? "<=" : "="} ${p}`;
    return rule.operator === "contains" ? `strpos(lower(coalesce(${expression}::text, '')), lower(${p})) > 0` : `lower(coalesce(${expression}::text, '')) = lower(${p})`;
  }
  const giftConditions: string[] = [];
  const giftIndices: number[] = [];
  const giftExists = (conditions: string) => `exists (select 1 from credited c join eligible g on g.id=c.gift_id
    left join public.funds f on f.id=g.fund_id left join public.campaigns ca on ca.id=g.campaign_id
    left join public.appeals ap on ap.id=g.appeal_id where c.donor_id=d.id and (${conditions}))`;
  const clauses = input.rules.map((rule, index) => {
    const field = queryFields.find(field => field.key === rule.field)!;
    const scalar: Record<string, string> = { name: "d.full_name", id: "d.donor_number", email: "d.primary_email", type: "d.donor_type", total: "coalesce(t.total, 0)" };
    scalar.giving_level = "(select gl.giving_level_display from public.donor_current_year_giving_levels gl where gl.donor_id=d.id)";
    scalar.sms_consent = "coalesce((select p.consent_status from public.donor_sms_preferences p where p.donor_id=d.id), 'UNKNOWN')";
    if (field.source === "donor") return condition(`d.${field.column}`, rule, field.numeric);
    if (scalar[rule.field]) return condition(scalar[rule.field], rule, rule.field === "total");
    if (rule.field === "city" || rule.field === "state" || field.source === "address") {
      const column = field.column ?? (rule.field === "city" ? "city" : "state_region");
      const present = `select 1 from public.donor_addresses a where a.donor_id=d.id and a.is_primary`;
      return rule.operator === "blank" ? `not exists (${present} and coalesce(a.${column}, '') <> '')` : `exists (${present} and ${condition(`a.${column}`, rule)})`;
    }
    const giftFields: Record<string, string> = { amount: "c.amount", fund: "f.name", campaign: "ca.name", appeal: "ap.name" };
    const expression = field.source === "gift" ? `g.${field.column}` : giftFields[rule.field];
    const predicate = condition(expression, rule, field.numeric);
    giftConditions.push(predicate); giftIndices.push(index);
    return giftExists(predicate);
  });
  const combineGifts = input.sameGift && input.mode === "all" && giftConditions.length > 0;
  const finalConditions = clauses.map((_, i) => `rule_${i}`).filter((_, i) => !combineGifts || !giftIndices.includes(i));
  if (combineGifts) finalConditions.push("gift_group");
  const periodSql = input.period === "custom" ? `and gift_date between ${bind(input.from!)}::date and ${bind(input.to!)}::date` : input.period === "year" ? "and gift_date >= date_trunc('year', current_date)::date and gift_date < (date_trunc('year', current_date) + interval '1 year')::date" : "";
  return { params, sql: `with eligible as (
    select * from public.gifts where deleted_at is null
    ${periodSql}
  ), raw_credit as (
    select donor_id, id as gift_id, amount_cents::bigint as amount, true as hard from eligible
    ${input.credit === "both" ? "union all select sc.donor_id, sc.gift_id, sc.amount_cents::bigint, false from public.soft_credits sc join eligible g on g.id=sc.gift_id" : ""}
  ), credited as (
    select donor_id, gift_id, coalesce(max(amount) filter(where hard), max(amount)) as amount,
      bool_or(hard) as hard from raw_credit group by donor_id, gift_id
  ), totals as (
    select c.donor_id, sum(amount) filter(where g.gift_type in ('PLEDGE','CASH','STOCK_PROPERTY','GIFT_IN_KIND','MATCHING_GIFT_PLEDGE')) as total,
      bool_or(hard) as has_hard, bool_or(not hard) as has_soft from credited c join eligible g on g.id=c.gift_id group by c.donor_id
  ), donors as (
    select *, case when donor_type='ORGANIZATION' then coalesce(organization_name, '') else trim(concat_ws(' ', first_name, last_name)) end as full_name
    from public.donors where deleted_at is null
  ), matches as (
    select d.id::text, d.donor_number::text, d.full_name, d.primary_email::text,
      coalesce(t.total,0)::text as total_cents, coalesce(t.has_hard,false) as has_hard, coalesce(t.has_soft,false) as has_soft,
      ${clauses.map((clause, i) => `(${clause}) as rule_${i}`).join(",")},
      ${combineGifts ? giftExists(giftConditions.join(" and ")) : "true"} as gift_group,
      exists(select 1 from credited c where c.donor_id=d.id) as has_gift
    from donors d left join totals t on t.donor_id=d.id
  ) select *, count(*) over()::text as match_count from matches
    where (${finalConditions.join(input.mode === "all" ? " and " : " or ")}) ${input.requireGift ? "and has_gift" : ""}
    order by full_name, id limit 200` };
}
