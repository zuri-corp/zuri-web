# Lore timeline and cross-app actions

Chapter headers now use an explicit coverImage, independent of chapter moments. Edit supports title, description, cover upload/change/removal. Chapter list cards use the same chosen cover.

A unified chronological timeline displays chapter photo/video moments, notes, shared tasks and linked events in individual post-style cards. It replaces the collapsed gallery and separate note-only timeline. Captions and notes preserve line breaks; dates use readable Kampala formatting; cards have clear author/type/date headers. Task controls remain shared with Planner. Unlinking does not delete original media, tasks or events; note deletion still asks for confirmation.

Add Moment is available inside Chapters, individual moments and the Lore Moments screen. The Lore composer saves locally to Lore and links to its originating Chapter when provided. Existing Rizz Create remains available for feed posts.

Local moments can be copied to an owned, active channel through an explicit channel/caption form; source media and chapter remain unchanged. Video is copied into the update, not only referenced. Channel updates link back to the original Lore moment. Moments can also become dated Planner tasks; those tasks link back to the original moment. Missing channels have a create-channel action.

Validation: 74 automated tests, including timeline interleaving, independent covers, save/reload, channel conversion ownership and source preservation, and task due-date validation. Browser checked an existing populated Chapter, cover editor, channel form and Lore moment composer. Live publishing/delivery remains outside this local prototype.
