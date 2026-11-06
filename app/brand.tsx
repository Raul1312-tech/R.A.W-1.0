/** Shared vector lockup. The artwork stays sharp at every screen size. */
export default function Brand({onLight=false}:{onLight?:boolean}){return <img className="rise-logo" src={onLight?'/brand/rise-boxing-ink.svg':'/brand/rise-boxing.svg'} width="176" height="66" alt="RISE Boxing"/>}
