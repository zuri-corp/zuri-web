'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
export default function ConversationShortcut(){const path=usePathname();if(path.startsWith('/tech/studio')||path==='/pamoja/tools'||path==='/app'||path==='/experience'||path.startsWith('/admin')||path.includes('/enquire')||path.includes('/templates/')||path==='/tech/invites/demo'||path==='/pamoja/connect')return null;return <Link href="/tech#zuri-conversation" className="conversation-shortcut"><span aria-hidden="true">✦</span> Talk to ZURI ↗</Link>}
