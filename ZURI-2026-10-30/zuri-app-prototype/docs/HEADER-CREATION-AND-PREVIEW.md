# Header, creation return paths, media and customer preview

Headers now show the current world character logo instead of home/back controls. The logo returns to Lounge; Lounge uses the Aura logo to open Aura. System/browser back remains available.

Completed creation transitions replace the form entry in browser history, retaining the original source entry and its saved view state. Re-saving an event draft also replaces its editor entry. This applies to new objects, Rizz Create, offering/Space/channel editors, checkout, enquiries and updates. Inline creation forms already retain their originating screen.

Society topic openings, thread replies and group messages accept resized JPEG/PNG/WebP photo attachments. Image-only replies are supported. Photos retain nested reply relationships and survive backup reload. Video attachments are not added by this change.

Space Wall → Preview as a customer renders the normal customer Space layout, including active offerings, activity and enquiry entry points. The preview banner returns to management. Viewing a draft does not publish it.

Shared Lore: the local Society owner can link/unlink their own Chapters. Content editing stays with the Chapter author; links do not grant access. Other users see disabled linking controls. Verified moderator/collaborator grants remain pending server roles.

Validation: 96 tests pass, including return-history policy, photo persistence/source validation and canonical preview routing. Production build checked. Browser interaction/visual verification remains unavailable in this turn.
