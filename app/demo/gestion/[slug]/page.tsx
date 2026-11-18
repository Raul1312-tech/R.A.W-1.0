import Management from '../../../management';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <Management mode="company" slug={slug} demo/>}
