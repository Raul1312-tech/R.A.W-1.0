import Login from './screen';
import {configured} from '../../lib/supabase/config';
export default function Page(){return <Login configured={configured()}/>}
