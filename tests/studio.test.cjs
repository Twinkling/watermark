const test=require('node:test'), assert=require('node:assert/strict');
const E=require('../src/studio.js');
test('批量比例裁剪分别适配横图和竖图',()=>{
 const d=E.defaults(); d.edit.cropAspect=1;
 for(const [w,h] of [[1200,800],[640,960]]) {
  const actual=E.dimensions(w,h,d);
  assert.equal(actual.width,Math.min(w,h));assert.equal(actual.height,Math.min(w,h));
 }
});
test('裁剪、旋转、缩放和边框按固定次序计算输出尺寸',()=>{
 const d=E.defaults();d.edit.crop={x:.1,y:.1,w:.5,h:.5};d.edit.rotate=1;
 assert.deepEqual([E.dimensions(1600,1000,d).width,E.dimensions(1600,1000,d).height],[500,800]);
 d.edit.resize=400;d.edit.frame='instant';d.edit.frameSize=10;
 const out=E.dimensions(1600,1000,d);assert.deepEqual([out.photoWidth,out.photoHeight,out.width,out.height],[250,400,300,500]);
});
test('模板中的越界参数与未知样式被规范化，裁剪不会溢出原图',()=>{
 const d=E.normalize({edit:{crop:{x:.99,y:-1,w:10,h:0},resizeMode:'invalid',frame:'script'},layers:[{id:'x',type:'script',font:'url(evil)',size:Infinity,x:-20,y:50,opacity:999}]});
 assert.equal(d.edit.crop.x+d.edit.crop.w,1);assert.equal(d.edit.crop.y,0);assert.equal(d.edit.crop.h,.01);assert.equal(d.edit.frame,'none');assert.equal(d.layers[0].type,'text');assert.equal(d.layers[0].font,'sans');assert.equal(d.layers[0].x,0);assert.equal(d.layers[0].y,1);assert.equal(d.layers[0].opacity,100);
});
test('边缘定位约束包含旋转后水印的全部边界',()=>{
 const ctx={font:'',measureText:t=>({width:t.length*20})};
 for(const angle of [-180,-90,-30,0,45,90,180]){const l={...E.layer(),mode:'single',text:'LONG TEXT '.repeat(5),size:20,angle,x:0,y:1};const g=E.geometry(ctx,320,120,l,new Map());assert.ok(g.x-g.bx/2>=-.0001);assert.ok(g.x+g.bx/2<=320.0001);assert.ok(g.y-g.by/2>=-.0001);assert.ok(g.y+g.by/2<=120.0001);}
});
test('独立图片配置、模板与默认设置不会共享可变对象',()=>{const base=E.defaults(),override=E.clone(base);override.layers[0].text='仅当前';override.edit.crop.w=.5;assert.notEqual(base.layers[0].text,override.layers[0].text);assert.equal(base.edit.crop.w,1);});
test('长边缩放不放大，指定画布保留宽高设置',()=>{const d=E.defaults();d.edit.resize=2000;assert.equal(E.dimensions(96,64,d).width,96);d.edit.resizeMode='contain';d.edit.width=1080;d.edit.height=1350;assert.deepEqual([E.dimensions(96,64,d).width,E.dimensions(96,64,d).height],[1080,1350]);});
