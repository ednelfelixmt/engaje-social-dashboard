'use client';
import {useEffect,useRef} from 'react';

// Palco do login: luz prateada que corre pelas bordas, foco suave que segue o cursor e grão de filme.
const VERTEX='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAGMENT=`precision highp float;uniform vec2 u_res,u_m;uniform float u_t;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;float A=u_res.x/u_res.y;vec2 q=uv-.5;vec2 p=vec2(uv.x*A,uv.y);vec2 mp=vec2(u_m.x*A,u_m.y);
  float d=min(min(uv.x*A,(1.-uv.x)*A),min(uv.y,1.-uv.y));float ang=atan(q.y,q.x);float t=u_t*.35;
  float lobes=.5+.5*sin(ang*3.+t+sin(ang*2.-t*.7)*1.5);lobes*=lobes;
  float edge=exp(-d*15.)*(.1+.75*lobes);
  float near=exp(-distance(p,mp)*3.);edge+=exp(-d*20.)*near*.6;
  float spot=exp(-dot(p-mp,p-mp)*6.)*.05;
  float glow=exp(-dot(q,q)*4.)*.035;
  float vig=1.-smoothstep(.25,1.15,length(q*vec2(1.,1.15)));
  float l=clamp((edge+spot+glow)*vig,0.,.7);
  vec3 tint=mix(vec3(.62,.78,1.),vec3(.78,.65,1.),lobes);vec3 col=mix(vec3(.9,.93,1.),tint,.65)*l;
  col+=(h21(gl_FragCoord.xy+fract(u_t)*91.7)-.5)*.045*(l*3.+.2);
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;

export function LoginStage(){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    const gl=canvas.getContext('webgl',{antialias:false});if(!gl)return;
    gl.clearColor(.02,.02,.02,1);gl.clear(gl.COLOR_BUFFER_BIT);
    const make=(type:number,source:string)=>{const shader=gl.createShader(type);if(!shader)return null;gl.shaderSource(shader,source);gl.compileShader(shader);return gl.getShaderParameter(shader,gl.COMPILE_STATUS)?shader:null;};
    const vertex=make(gl.VERTEX_SHADER,VERTEX),fragment=make(gl.FRAGMENT_SHADER,FRAGMENT);
    const program=gl.createProgram();if(!vertex||!fragment||!program)return;
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uRes=gl.getUniformLocation(program,'u_res'),uTime=gl.getUniformLocation(program,'u_t'),uMouse=gl.getUniformLocation(program,'u_m');
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tx=.5,ty=.55,mx=.5,my=.55,raf=0,first=true,last=0,prev=0,slow=0;
    const onMove=(event:PointerEvent)=>{tx=event.clientX/window.innerWidth;ty=1-event.clientY/window.innerHeight;};
    const draw=(now:number)=>{
      // Dispositivo lento: depois de vários quadros demorados, congela o palco para não atrasar o resto da página.
      if(prev){slow=now-prev>70?slow+1:Math.max(0,slow-1);}
      prev=now;
      if(first||(!document.hidden&&now-last>=33)){
        last=now;
        first=false;
        const ratio=.6;
        const width=Math.max(1,Math.floor(canvas.clientWidth*ratio)),height=Math.max(1,Math.floor(canvas.clientHeight*ratio));
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
        mx+=(tx-mx)*.06;my+=(ty-my)*.06;
        gl.uniform2f(uRes,width,height);gl.uniform1f(uTime,reduce?0:now/1000);gl.uniform2f(uMouse,mx,my);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
      if(!reduce&&slow<12)raf=requestAnimationFrame(draw);
    };
    if(!reduce)window.addEventListener('pointermove',onMove,{passive:true});
    draw(performance.now());
    const onResize=()=>{if(reduce)raf=requestAnimationFrame(draw);};
    window.addEventListener('resize',onResize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('pointermove',onMove);window.removeEventListener('resize',onResize);};
  },[]);
  return <canvas ref={ref} className='zf-stage' aria-hidden='true'/>;
}
