import assert from "node:assert/strict";
import { Client } from "pg";

// Intentionally restricted to the disposable loopback database.
const client = new Client({ host: "127.0.0.1", port: 55439, database: "postgres", user: process.env.USER });
try {
  await client.connect();
  await client.query("begin");
  await client.query("set local role crm_runtime");
  const donor = await client.query("insert into public.donors (donor_type,first_name,last_name) values ('INDIVIDUAL','Synthetic','Security Test') returning id,donor_number");
  assert.ok(donor.rows[0].donor_number);
  const fund = await client.query("insert into public.funds (name) values ('Synthetic test fund') returning id");
  const gift = await client.query("insert into public.gifts (donor_id,fund_id,amount_cents,gift_date,gift_type) values ($1,$2,10000,current_date,'CASH') returning id,gift_number", [donor.rows[0].id,fund.rows[0].id]);
  assert.ok(gift.rows[0].gift_number);
  await client.query("update public.donors set preferred_name='Synthetic Updated' where id=$1", [donor.rows[0].id]);
  await client.query("insert into public.audit_log (action,entity_type,status) values ('security.test','test','success')");
  await client.query("select * from public.donor_giving_totals where donor_id=$1", [donor.rows[0].id]);
  for (const sql of [
    "update public.audit_log set action='tampered' where false",
    "delete from public.audit_log where false",
    "truncate public.audit_log",
    "delete from public.donors where false",
    "delete from public.gifts where false",
    "alter table public.donors add column unauthorized text",
    "create table public.unauthorized (id int)",
    "create role unauthorized",
    "select setval('public.donor_number_seq',1)"
  ]) {
    await client.query("savepoint denied_operation");
    await assert.rejects(client.query(sql), (error) => error.code === "42501");
    await client.query("rollback to savepoint denied_operation");
  }
  await client.query("rollback");
  console.log("Runtime grants passed: synthetic donor/gift creation, update, audit append and report read; nine destructive/privilege operations denied.");
} finally {
  await client.end();
}
