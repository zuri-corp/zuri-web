# Chapter clarity and task planning

Implemented 21 October 2026.

Chapters now start with an overview: purpose, completed/total tasks, moment and note counts, and the next incomplete action. Explicit due dates determine the next action; undated tasks remain valid and no date is inferred from prose.

One expandable Add control exposes Note, Task, Event and Media. Media explicitly separates uploading a photo/video from linking existing moments. The gallery is expandable, and the timeline remains visible without opening the editor. Evidence and Collaborators now live under More options.

Tasks support an optional due date, optional responsible-person label, and To do/In progress/Done status. Planning fields can be edited from the chapter entry or Motion Planner. Completion checkboxes keep status consistent. Older tasks retain their original creation dates and receive no invented deadlines or assignments. The responsible-person field is a local planning label, not an account invitation or permission grant.

Removal is explicit: unlinking a task keeps it in Planner; unlinking media keeps it in Moments; unlinking an event leaves its original unchanged. Deleting a note or removing a chapter requires a second explicit in-app action. Chapter removal retains original tasks and media and clears their obsolete chapter references.

Lounge's Friends widget is now labelled Your people, matching its actual source: recent local conversations and followed people. Bottom navigation behaviour is unchanged.

Verification: production build and 55 automated tests passed, including new date validation, planning persistence, progress/next-action logic and chapter removal preservation tests. A fresh browser interaction/visual check was unavailable because browser policy denied access to the preview. No workaround was attempted and no visual verification is claimed.
