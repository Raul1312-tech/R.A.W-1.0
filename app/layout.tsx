import type {Metadata,Viewport} from 'next';
import './globals.css';
import './training.css';
import './calendar.css';
import './daily-food.css';
import './experience.css';
import './carousel.css';
import './shopping.css';
import './preparation.css';
import './competition.css';
export const viewport:Viewport={width:'device-width',initialScale:1,maximumScale:1,userScalable:false,viewportFit:'cover'};
export const metadata:Metadata={title:'RISE · Entrenamiento y nutrición',description:'Tu alimentación, entrenamiento y progreso en un espacio privado.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
import './learning-journal.css';

import './rise-brand.css';
import './mobile-ux.css';
import './select-field.css';
import './today.css';
import './athlete-dark.css';
import './editorial-theme.css';
import './management.css';
import './client-followup.css';
import './client-month-plans.css';
import './management-polish.css';
import './onboarding-mobile.css';
