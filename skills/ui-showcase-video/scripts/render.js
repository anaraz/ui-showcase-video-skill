// usage: node render2.js html out.mp4 fps sub startFrame endFrame
const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{
  const [,,html,out,fps,sub,f0,f1,shut]=process.argv;const F=+fps,SB=+sub,SH=+(shut||1);
  const ff=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-c:v','mjpeg','-framerate',String(F*SB),'-i','-',
    '-vf',`tmix=frames=${SB},select='eq(mod(n\\,${SB})\\,${SB-1})',setpts=N/${F}/TB`,'-r',String(F),
    '-c:v','libx264','-crf','15','-preset','medium','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
  const b=await chromium.launch();
  const pg=await b.newPage({viewport:{width:1920,height:1080}});
  pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.goto('file://'+html); await pg.waitForLoadState('networkidle');
  await pg.evaluate(()=>Promise.allSettled([...document.images].map(i=>i.decode())));
  for(let f=+f0;f<+f1;f++)for(let j=0;j<SB;j++){
    // centered shutter: samples spread over (f-0.5, f+0.5)
    const t=(f-SH/2+SH*(j+0.5)/SB)/F;
    await pg.evaluate(t=>window.render(t),Math.max(0,t));
    const buf=await pg.screenshot({type:'jpeg',quality:93});
    if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
  }
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();
})();
