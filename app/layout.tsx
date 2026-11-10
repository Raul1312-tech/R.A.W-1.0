import type {Metadata} from 'next';
import './globals.css';
import './training.css';
import './calendar.css';
import './daily-food.css';
import './experience.css';
import './carousel.css';
import './shopping.css';
import './preparation.css';
import './competition.css';
export const metadata:Metadata={title:'RISE Boxing · Fuerza y nutrición',description:'Tu alimentación, entrenamiento y progreso en un espacio privado.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
import './learning-journal.css';

import './rise-brand.css';
import './mobile-ux.css';
import './select-field.css';
