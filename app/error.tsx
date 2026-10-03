'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <div className="focus-main stack" role="alert"><h1>This page could not open</h1><p>Your progress has not been reset. Try loading the page again.</p><button className="button button-primary" onClick={reset}>Try again</button></div>;}
