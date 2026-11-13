# GabayNegosyo Admin Guide

Client handbook for GabayNegosyo v1.0.0 | 13 November 2026

## 1. Sign in and find your way around

Sign in with the account your project owner has assigned the Admin role. Open /admin on your GabayNegosyo website. A Free, Premium or demo login does not give you administrator access. If you return to Log in, check that you signed in with the correct email and ask the project owner to confirm your role.

On a computer, use the labeled Admin center menu. On a phone, scroll the admin navigation sideways to see the remaining tabs. Use the theme button to switch between Light mode and Night Shift. Select Log out when you finish, especially on a shared computer.

- Dashboard: Review account counts, sync and the content review queue.
- Agencies, Requirements, Resources and Tutorials: Maintain content in your browser.
- Users and Audit log: Manage and verify account and Premium changes.
- Manual reminders: Prepare reminders and record messages sent outside the website.

### Where changes go

Content changes are saved only in the current browser profile and website. Another computer, a private tab, or the deployed site may show the original content. Clearing site data can remove local edits. Ask your project maintainer to publish approved shared content. Keep a separate record of approved text and source links.

User status, Premium changes and reminder records use Supabase. Use an authorized administrator account and check the outcome on the relevant screen before repeating an action.

## 2. Dashboard and agency references

### Dashboard

1. Open Admin and scan Users and sync. Compare the sign-in and profile counts.
2. Select Refresh to request updated counts. The panel also refreshes periodically when open.
3. If missing profiles are reported, select Sync now. This creates missing profile records. It does not remove orphaned profiles. If orphaned profiles remain, send the count to your project maintainer.
4. Review the Content overview and Content review queue. Select an item name to open its editor, then find that item in the list. The dashboard shows up to eight queue items. Check the editors for the full lists.

### Agencies

1. Open Agencies and locate the agency. Select Open website to inspect its current reference in a new tab.
2. Select Edit details. Update the display name, plain-language description and official HTTPS website as needed.
3. Select Save changes and look for the confirmation. Select Cancel to discard the draft.

Agency identifiers tie records together and are fixed. For changes to the agency list, contact the project maintainer.

## 3. Requirements and resources

### Requirements

1. Choose Edit beside an existing requirement, or complete the Add requirement for review form.
2. Enter the name, agency, explanation, audience, stage and timing as stated by the issuing agency.
3. Enter one document per line under What to prepare and one action per line under What to do. Add the official source and the date you checked it.
4. Select Save changes or Add for review. Select Cancel editing to discard an edit. Check the updated card and open the official source before sharing guidance.

New entries are marked Needs content review. The form preserves existing eligibility and structured date rules. Changing the timing description alone does not change calendar dates, reminders, or eligibility. Ask the maintainer to review rule changes and publish verified requirements.

### Resources

1. Open Resources. Add a title, agency, resource type, short description, complete HTTPS link and the date you checked the source.
2. Select Preview source to confirm it opens the intended official page or form. Select Add resource or Save changes.
3. Use Open source to recheck a saved item, or Edit to replace a broken or outdated link. Use Cancel editing to leave the original record in place.

### Archive

Review the item name in the confirmation dialog before proceeding. Archive hides a built-in entry in this browser and removes an entry created in the editor. There is no restore button. Keep a copy of the details before archiving.

## 4. Tutorials and video links

1. Open Tutorials. Enter a video title, agency, topic, short description and a public YouTube link. A watch link or youtu.be link is supported.
2. Use Open on YouTube to verify the video and confirm the advice is current. If verification is pending, leave Video is still awaiting verification checked. Uncheck it once the video is ready to use.
3. Select Add tutorial or Save changes. Select Edit to revise an existing entry, Open video to inspect its destination, or Cancel editing to discard the edit.
4. Check the Tutorials or Renewal & Post-Registration tab in the same browser. A verified link appears as a green Video Available panel and opens YouTube in a new tab. The creator hosts the video on YouTube.
5. If a creator removes or restricts a video, verify a replacement before updating the link. Keep the ownership credit and use Archive when you want to remove the entry from the list.

## 5. Users and Premium access

1. Open Users. Search by name or email and use the role filters to narrow the list. Use Previous and Next to browse results. Verify the exact email, plan and account status before acting.
2. Choose Grant Premium to enable access. Enter an expiry date if applicable. Access expires at the end of that day in Manila time. A blank date means no scheduled expiry. Confirm the term with your team.
3. Choose Revoke Premium to remove Premium access. Revoking Premium is separate from deactivating the account.
4. Choose Deactivate to block account access or Reactivate to restore it. These controls do not delete the account. Administrator accounts cannot be managed from this screen.
5. Enter a clear reason of 3 to 300 characters and select Confirm. Select Cancel to abandon the operation. After saving, verify the updated row and Audit log. If you see a warning after a confirmed save, read it before retrying.

Premium is granted manually. The site advertises PHP 199 per month and does not take payment or automatically renew access. Follow the process approved by your team. Keep reasons short and avoid including credentials or payment details.

### Audit log

Open Audit log to see the newest account and Premium actions first. Review the actor, target, date, reason and any displayed before/after details. Use Previous and Next for older records, or Try again if loading fails. Audit entries are read-only. Browser-local content edits are outside this log.

## 6. Manual reminders and troubleshooting

### Prepare and record a reminder

1. Open Manual reminders and select Refresh queue. It lists eligible upcoming deadlines within 45 days for active, opted-in Premium users. Confirm the recipient, requirement, due date and reminder date.
2. Select Show prepared message to review the subject and body. Select Copy message, or copy the displayed subject and body manually if clipboard access is blocked.
3. Send the message using your team's approved email process outside GabayNegosyo. Wait until the send succeeds.
4. Tick I confirm this email was sent manually for that row and select Record manual send. Verify Recorded as sent. A record is kept once per user, requirement, due date and reminder offset. This button records the send only.

### Troubleshooting

- Save or Archive fails: Check browser storage permissions and available space. Keep the current tab open while retrying so you can keep your draft.
- Changes appear on only one device: Review where content changes are stored in section 1. Give approved updates to the maintainer for publication.
- Confirm is disabled: Enter a reason and wait for any current request to finish. If you set an expiry date, check that it is valid.
- Users shows read-only mode, or a migration message: Send the exact message to the project maintainer. They can check the required database migrations and the account's role.
- Reminder queue is empty: Check the date range, Premium access and reminder preferences. If an error appears, refresh and wait for the queue to load.
- You are unsure whether a change saved: Check the user row, audit entry or reminder record before retrying. Report the time, screen, action and error to your maintainer. Share only the details needed to resolve the issue.
