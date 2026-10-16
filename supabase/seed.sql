-- Demo seed: one org, Midnight Ransomware scenario, event DEMO2026, two demo teams.
-- Safe to re-run: deletes and recreates the demo org.
-- Flag hashes are SHA-256 of trim+lowercase+collapsed-whitespace plaintext.

delete from public.organizations where id = '00000000-0000-0000-0000-000000000001';

insert into public.organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Demo Org');

insert into public.scenarios (id, org_id, title, description) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'Midnight Ransomware',
   E'It is 00:12 at Northwind Logistics. The night shift reports that files across the Corp share have been renamed with a .lockd extension and a ransom note, README_RESTORE_FILES.txt, is sitting on every desktop. Backups are failing. You are the incident response team. Work through the evidence, answer each inject, and contain the breach.');

insert into public.events (id, org_id, scenario_id, name, join_code, status) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010', 'Midnight Ransomware - Demo', 'DEMO2026', 'live');

update public.events set started_at = now() where id = '00000000-0000-0000-0000-000000000020';

insert into public.injects (scenario_id, "order", title, body, evidence_url, type, options, flag_hash, points, hint, hint_penalty, explanation) values
  ('00000000-0000-0000-0000-000000000010', 1, 'Patient Zero Email',
   E'The email security gateway kept a log of yesterday\'s traffic. Somewhere in here is the message that started it all.\n\nQuestion: What is the sender address of the phishing email?',
   '/evidence/email_gateway.log', 'text', null,
   '004b9222436263784dc8790de2f69db71fd79337d8a4b135269b0ba85fb954e1', 100,
   'Look for a lookalike domain. Attackers swap characters so the domain reads like the real one at a glance.', 20,
   'The phish came from invoices@northw1nd-billing.com. The domain uses a digit 1 instead of the letter i, failed SPF and DKIM, and the recipient clicked the link 11 minutes later.'),
  ('00000000-0000-0000-0000-000000000010', 2, 'First Foothold',
   E'The identity team exported authentication events for the day. Find where the attacker first got in after the phishing click.\n\nQuestion: What is the hostname of the first machine with a successful login after the click?',
   '/evidence/auth_events.csv', 'text', null,
   'fe0b2f51af8b7cd0cd9739fe670c2631025066f6d593989785fb6a3eb1ce5b95', 150,
   'Sort by time and look only at events after the email click. Pay attention to the source IP and the detail column.', 30,
   'FIN-WS-042 shows a successful logon for r.alvarez from external IP 185.199.42.17 shortly after the click, flagged as a new device. Every later lateral movement comes from the same IP.'),
  ('00000000-0000-0000-0000-000000000010', 3, 'First Move',
   E'The CFO is on the phone. The attacker is still active and encryption is spreading across the file server.\n\nQuestion: What is your first containment action?',
   null, 'mcq',
   '["Pay the ransom","Isolate affected machines from the network","Wipe all machines immediately","Email staff to reboot"]'::jsonb,
   'adb2c2a2fb5d08f343f12a216f7a107ddf404cfff47ff87d848a038c34490eed', 100, null, 0,
   'Isolation stops the spread and preserves evidence. Paying funds the attacker with no guarantee, wiping destroys forensic evidence, and a reboot does nothing against an active adversary.'),
  ('00000000-0000-0000-0000-000000000010', 4, 'What Did They Take',
   E'Legal needs to know whether this is also a data breach. The file server access log covers the hours before encryption.\n\nQuestion: Which file was exfiltrated?',
   '/evidence/file_access.log', 'text', null,
   '6ef7f51bb4019ad6d298e626abc9e4d56a29b5c4d0430dbfa0bc769f0879976f', 200,
   'Look for large outbound transfers to an external destination.', 40,
   'customer_master_2026.xlsx (48 MB) was read, compressed to cm.7z and uploaded to an external host from the attacker IP. This triggers breach-notification obligations.');

insert into public.teams (id, org_id, event_id, name) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'Blue Team'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'Night Shift');

insert into public.team_progress (team_id, org_id) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001');

-- To make a signed-in user a facilitator for the demo org, run:
-- insert into public.members (org_id, user_id, role)
--   select '00000000-0000-0000-0000-000000000001', id, 'facilitator' from auth.users where email = 'you@example.com';
