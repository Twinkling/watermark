const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../src/studio.js');
const geometry=import('../src/ui/geometry.mjs');
const inside=c=>{assert.ok(c.x>=-1e-10&&c.y>=-1e-10&&c.w>0&&c.h>0);assert.ok(c.x+c.w<=1+1e-10&&c.y+c.h<=1+1e-10);};
test('裁剪框移动到边缘时仍保持大小且不越过原图',async()=>{
 const {moveCrop}=await geometry,c={x:.2,y:.1,w:.4,h:.6};
 assert.deepEqual(moveCrop(c,-10,10),{x:0,y:.4,w:.4,h:.6});assert.deepEqual(c,{x:.2,y:.1,w:.4,h:.6});
});
test('四角缩放锁定比例并保持在图片内，覆盖横竖构图和越界拖动',async()=>{
 const {resizeCrop}=await geometry;
 for(const ratio of [.25,.6666666667,1,2,4])for(const handle of ['nw','ne','sw','se'])for(const dx of [-2,-.1,.15,2])for(const dy of [-2,-.13,.12,2]){
  const c=resizeCrop({x:.2,y:.2,w:.4,h:.4},handle,dx,dy,ratio);inside(c);assert.ok(Math.abs(c.w/c.h-ratio)<1e-8);
 }
});
test('从任意方向重新框选也保持比例并限制在原图边界内',async()=>{
 const {drawCrop}=await geometry;
 for(const x of [0,.5,1])for(const y of [0,.5,1])for(const ex of [-1,.2,2])for(const ey of [-1,.6,2])for(const ratio of [0,.5,2]){
  const c=drawCrop({x,y},{x:ex,y:ey},ratio);inside(c);if(ratio)assert.ok(Math.abs(c.w/c.h-ratio)<1e-8);
 }
});
test('模板保留水印名称，旧模板没有名称时仍可读取',()=>{
 const d=model.defaults();d.layers[0].name='签名 A';assert.equal(model.normalize(d).layers[0].name,'签名 A');
 delete d.layers[0].name;assert.equal(model.normalize(d).layers[0].name,'');
});
