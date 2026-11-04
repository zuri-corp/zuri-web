type World = 'corporate' | 'tech' | 'select' | 'pamoja';
const crops: Record<World, string> = { corporate: '452 180 830 270', tech: '60 580 445 111', select: '584 580 520 111', pamoja: '1170 580 554 111' };
export default function BrandMark({world='corporate',className=''}:{world?:World;className?:string}) {
 if(world==='corporate') return <svg className={`brand-mark brand-corporate ${className}`} viewBox="75 130 1630 575" role="img" aria-label="ZURI"><image href="/brands/zuri-corporate-purple.png" width="1774" height="887"/></svg>;
 return <svg className={`brand-mark brand-${world} ${className}`} viewBox={crops[world]} role="img" aria-label={world==='tech'?'Tech':world==='select'?'Select':'Pamoja'}><image href="/brands/zuri-family.png" width="1774" height="887"/></svg>;
}

