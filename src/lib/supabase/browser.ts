'use client';
import {createBrowserClient} from '@supabase/ssr';
import {supabaseUrl,supabaseKey} from './config';
import type {Database} from '@/types/database.types';
export function browserClient(){return createBrowserClient<Database>(supabaseUrl,supabaseKey);}
