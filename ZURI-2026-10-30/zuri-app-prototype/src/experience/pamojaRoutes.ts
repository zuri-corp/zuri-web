export const pamojaRoutes={
 'cloud-chat':['rizz','Chats','Conversation'],'cloud-public':['aura','Find','Public introduction'],'cloud-files':['lore','Profile','Your private files'],'device-review':['lore','Profile','Review device work'],
 'notification-preview':['lounge','','Notification design'],
 notifications:['lounge','','Notifications'],
 discovery:['aura','Find','Find your network'],
 'world-guide':['lounge','','Your world'],members:['lore','Profile','Members'],wallet:['lore','Profile','Wallet'],orders:['lore','Profile','Requests'],order:['lore','Profile','Request'],checkout:['aura','Find','Review order'],offer:['aura','Find','Offering'],payments:['lore','Profile','Payment methods'],refund:['lore','Profile','Refunds & help'],
 'space-preview':['aura','Spaces','Customer preview'],'my-spaces':['aura','Spaces','Your Spaces'],'new-space':['aura','Spaces','Create a Space'],'space-wall':['aura','Spaces','Space Wall'],'space-settings':['aura','Spaces','Space settings'],'space-offerings':['aura','Spaces','Manage offerings'],'offer-editor':['aura','Spaces','New offering'],'space-tags':['aura','Spaces','Tagged moments'],'enquiry-draft':['lore','Profile','Enquiry draft'],enquiry:['aura','Spaces','Space enquiry'],echo:['aura','Spaces','Space updates'],'echo-compose':['aura','Spaces','Write an update'],
 'society-lore':['aura','Societies','Shared Lore'],'society-members':['aura','Societies','Members'],'society-gallery':['aura','Societies','Gallery'],'society-manage':['aura','Societies','Society settings'],'new-society':['aura','Societies','Create a Society'],
 'ping-schedule':['motion','Pings','Ping schedule'],
 'new-trip':['motion','Events','Plan a trip'],'trip-room':['motion','Events','Trip coordination'],'trip-chat':['motion','Events','Trip conversation'],'host-wall':['motion','Events','Host Wall'],'event-create':['motion','Events','Draft an event'],
 'chapter-evidence':['lore','Chapters','Chapter evidence'],'chapter-people':['lore','Chapters','Collaborators'],reputation:['lore','Profile','Experience & trust'],'tier-application':['lore','Profile','Tier application'],
 'privacy-core':['lore','Profile','Data & privacy'],privacy:['lore','Profile','Privacy & safety'],report:['lore','Profile','Report an issue'],reports:['lore','Profile','Your reports'],appeal:['lore','Profile','Appeal'],relationships:['lore','Profile','People & interests'],'feed-controls':['rizz','Feed','Your feed'],'object-actions':['lore','Profile','About this experience'],
 extensions:['aura','Find','Tools'],tool:['aura','Find','Tool details'],'tool-access':['aura','Find','Tool permissions'],'tool-run':['aura','Find','Tool workspace'],games:['aura','Find','Play'],game:['aura','Find','Pairs'],
 'assistant-settings':['lounge','','Viola context'],appearance:['lounge','','Make it yours'],readiness:['lore','Profile','Workspace status'],
} as const;
export type PamojaKind=keyof typeof pamojaRoutes;
