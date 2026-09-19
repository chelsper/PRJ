import { profileQuerySchema, type ProfileQuery } from "@/lib/profile-query";

export function compileProfileQuery(raw: ProfileQuery) {
  const input = profileQuerySchema.parse(raw);
  const params: (string | number)[] = [];
  const bind = (value: string | number) => { params.push(value); return `$${params.length}`; };
  function condition(expression: string, rule: ProfileQuery["rules"][number], numeric = false) {
    if (rule.operator === "blank") return `coalesce(${expression}::text, '') = ''`;
    const p = bind(numeric ? Math.round(Number(rule.value) * 100) : rule.value);
    if (numeric) return `${expression} ${rule.operator === "gte" ? ">=" : rule.operator === "lte" ? "<=" : "="} ${p}::numeric`;
    return rule.operator === "contains" ? `strpos(lower(coalesce(${expression}::text, '')), lower(${p}::text)) > 0` : `lower(coalesce(${expression}::text, '')) = lower(${p}::text)`;
  }
  const clauses = input.rules.map(rule => {
    const scalar: Record<string, string> = { name: "d.full_name", id: "d.donor_number", email: "d.primary_email", type: "d.donor_type", total: "coalesce(t.total, 0)" };
    if (scalar[rule.field]) return condition(scalar[rule.field], rule, rule.field === "total");
    if (rule.field === "city" || rule.field === "state") {
      const column = rule.field === "city" ? "city" : "state_region";
      const present = `select 1 from public.donor_addresses a where a.donor_id=d.id and a.is_primary`;
      return rule.operator === "blank" ? `not exists (${present} and coalesce(a.${column}, '') <> '')` : `exists (${present} and ${condition(`a.${column}`, rule)})`;
    }
    const giftFields: Record<string, string> = { amount: "c.amount", fund: "f.name", campaign: "ca.name", appeal: "ap.name" };
    const expression = giftFields[rule.field];
    return `exists (select 1 from credited c join eligible g on g.id=c.gift_id
      left join public.funds f on f.id=g.fund_id left join public.campaigns ca on ca.id=g.campaign_id
      left join public.appeals ap on ap.id=g.appeal_id
      where c.donor_id=d.id and ${condition(expression!, rule, rule.field === "amount")})`;
  });
  return { params, sql: `with eligible as (
    select * from public.gifts where deleted_at is null
    and gift_type in ('PLEDGE','CASH','STOCK_PROPERTY','GIFT_IN_KIND','MATCHING_GIFT_PLEDGE')
    ${input.period === "year" ? "and gift_date >= date_trunc('year', current_date)::date and gift_date < (date_trunc('year', current_date) + interval '1 year')::date" : ""}
  ), raw_credit as (
    select donor_id, id as gift_id, amount_cents::bigint as amount, true as hard from eligible
    ${input.credit === "both" ? "union all select sc.donor_id, sc.gift_id, sc.amount_cents::bigint, false from public.soft_credits sc join eligible g on g.id=sc.gift_id" : ""}
  ), credited as (
    select donor_id, gift_id, coalesce(max(amount) filter(where hard), max(amount)) as amount,
      bool_or(hard) as hard from raw_credit group by donor_id, gift_id
  ), totals as (
    select donor_id, sum(amount) as total, bool_or(hard) as has_hard, bool_or(not hard) as has_soft from credited group by donor_id
  ), donors as (
    select *, case when donor_type='ORGANIZATION' then coalesce(organization_name, '') else trim(concat_ws(' ', first_name, last_name)) end as full_name
    from public.donors where deleted_at is null
  ), matches as (
    select d.id::text, d.donor_number::text, d.full_name, d.primary_email::text,
      coalesce(t.total,0)::text as total_cents, coalesce(t.has_hard,false) as has_hard, coalesce(t.has_soft,false) as has_soft,
      ${clauses.map((clause, i) => `(${clause}) as rule_${i}`).join(",")}
    from donors d left join totals t on t.donor_id=d.id
  ) select *, count(*) over()::text as match_count from matches
    where ${clauses.map((_, i) => `rule_${i}`).join(input.mode === "all" ? " and " : " or ")}
    order by full_name, id limit 200` };
}
