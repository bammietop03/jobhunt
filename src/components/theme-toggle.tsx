'use client';
import { Moon,Sun } from 'lucide-react';
import { useEffect,useState } from 'react';
export function ThemeToggle(){const [dark,setDark]=useState(false);useEffect(()=>{const value=localStorage.getItem('theme')==='dark';document.documentElement.classList.toggle('dark',value);const timer=setTimeout(()=>setDark(value),0);return()=>clearTimeout(timer)},[]);return <button className="btn btn-ghost" aria-label="Toggle dark mode" onClick={()=>{const next=!dark;setDark(next);localStorage.setItem('theme',next?'dark':'light');document.documentElement.classList.toggle('dark',next)}}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>}
