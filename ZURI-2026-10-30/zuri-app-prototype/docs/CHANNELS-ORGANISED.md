# Channels: understand a person, follow their progress

Channels now combine a creator introduction, a timeline and collections. They remain general-purpose: an artist, student, couple or maker can organise an ongoing story without adopting a specialised app.

## Implemented

- Creator identity links to the shared ZURI profile. Channel settings include a headline, introduction and expectations for updates.
- **Updates** provides a searchable timeline; **Collections** groups updates by subject; **Start here** introduces the creator and links their work or gatherings.
- Owners can create collections, write titled updates, select Update/Progress/Invitation/Resource, edit or move an existing update, and pin/unpin highlights.
- Updates and channel introductions support explicit context links to Spaces, Societies, events, Pings and Chapters. Linking does not grant access to a private source.
- Discover, Following and My channels separate finding people, keeping up and managing your own channels. Following is an actual local preference, not a fabricated live follower count.
- Existing channels and their posts remain readable. Existing sample Space archives are retained and labelled as sample material.
- Existing workspace storage and backup merge preserve collections and structured update metadata. Invalid collection references or malformed metadata are rejected on import.
- Channel view, collection filter, search and directory selection are remembered within the session. Reader controls have keyboard labels and use the app's day/night colours.

## Verified

Created an isolated artist demo; saved its introduction, pinned a progress update in Work & projects, added a custom collection, and saved an invitation linked to a Ping. Refresh retained the data. Following a sample channel placed it in Following. New model tests cover old data compatibility, backup round trips, editing, archive restrictions and malformed data.

## Still pending live services

Cross-account publishing, follower notifications, public invitation/share links, audience analytics, moderation and cloud synchronisation. The UI labels local following and delivery clearly. No external service was invented or contacted, and no main-workspace channel was changed during verification.

Channel photo/video upload, scheduled publishing and collection renaming/deletion are not part of this increment. Existing media remains visible; channel updates currently use text and linked objects.
