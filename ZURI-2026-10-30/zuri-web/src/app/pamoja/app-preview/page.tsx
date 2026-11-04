import {redirect} from 'next/navigation';
export const metadata={title:'Open the ZURI app',robots:{index:false,follow:false}};
export default function AppPreview(){redirect('/app')}
