import * as libengine from "/js/engine/engine.js";
import * as libengine_gameobject from "/js/engine/gameobject.js";
import * as libengine_gameinstance from "/js/engine/gameinstance.js";
import { firebaseConfig } from "/js/firebase_config.js";
import * as libfirebase_app from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import * as libfirebase_auth from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import * as libfirebase_firestore from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
function require(url){
    if (url.toLowerCase().substr(-3)!=='.js') url+='.js'; // to allow loading without js suffix;
    if (!require.cache) require.cache=[]; //init cache
    var exports=require.cache[url]; //get from cache
    if (!exports) { //not cached
            try {
                exports={};
                var X=new XMLHttpRequest();
                X.open("GET", url, 0); // sync
                X.send();
                if (X.status && X.status !== 200)  throw new Error(X.statusText);
                var source = X.responseText;
                // fix (if saved form for Chrome Dev Tools)
                if (source.substr(0,10)==="(function("){ 
                    var moduleStart = source.indexOf('{');
                    var moduleEnd = source.lastIndexOf('})');
                    var CDTcomment = source.indexOf('//@ ');
                    if (CDTcomment>-1 && CDTcomment<moduleStart+6) moduleStart = source.indexOf('\n',CDTcomment);
                    source = source.slice(moduleStart+1,moduleEnd-1); 
                } 
                // fix, add comment to show source on Chrome Dev Tools
                source="//@ sourceURL="+window.location.origin+url+"\n" + source;
                //------
                var module = { id: url, uri: url, exports:exports }; //according to node.js modules 
                var anonFn = new Function("require", "exports", "module", source); //create a Fn with module code, and 3 params: require, exports & module
                anonFn(require, exports, module); // call the Fn, Execute the module
                require.cache[url]  = exports = module.exports; //cache obj exported by module
            } catch (err) {
                throw new Error("Error loading module "+url+": "+err);
            }
    }
    return exports; //require returns object exported by module
}
const jsonpack = require("/js/jsonpack.js");

globalThis.engine = new libengine.Engine;
function check_collision_aabb_aabb(aabb1, aabb2) {
   return (
    aabb1.x1 < aabb2.x2 &&
    aabb1.x2 > aabb2.x1 &&
    aabb1.y1 < aabb2.y2 &&
    aabb1.y2 > aabb2.y1
  );
}
function length_between_x_y_x_y(x1, y1, x2, y2) {
    return Math.pow(
        Math.pow(x1-x2,2) + Math.pow(y1-y2,2),
        0.5
    );
}
document.body.onload = function () {    
    console.log('onload');
    
    let default_ondraw = (i, ctx) => {
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.fillRect(
            i.render_pos.x,
            i.render_pos.y,
            i.render_pos.w,
            i.render_pos.h
        );
    };
    
    let go_Sys1 = new libengine_gameobject.GameObject('Sys_Geography', {
        oninit: i => {
            i.ui = {
                is_dragged: false,
                selected: {x: 0, y: 0},
                brush_size: 1,
                brush_color: 'void',
                drag_origin: {
                    x: 0, y: 0,
                    mouse_x: 0, mouse_y: 0,
                },
            };
            i.map_size = {w: 32*8, h: 32*8};
            i.chunk_size = 32;
            i.projection = {
                translation: {x: 0, y: 0},
                scale: 6,
            };
            i.logined = false;
            i.blocks = {};
            for (let block_x = 0; block_x < i.map_size.w; ++block_x) {
                let chunk_x = Math.floor(block_x / i.chunk_size);
                for (let block_y = 0; block_y < i.map_size.h; ++block_y) {
                    let chunk_y = Math.floor(block_y / i.chunk_size)
                    let block = {
                        type: 'void',
                        /* ocean, deep-water, shallow-water, river, 
                           sand, green, forest, hills, mountain, 
                        */
                    };
                    
                    let a = (1 + Math.sin(0.5 * Math.pow(Math.pow(block_x, 2) + Math.pow(block_y, 2), 0.5))) / 2;
                    if ((chunk_x + chunk_y) % 2 == 0)
                        a = 1 - a;
                    block.a = a;
                    block.rect = {
                        x1: i.projection.translation.x + block_x * i.projection.scale,
                        y1: i.projection.translation.y + block_y * i.projection.scale,
                        x2: 0, y2: 0,
                    };
                    block.rect.x2 = block.rect.x1 + i.projection.scale;
                    block.rect.y2 = block.rect.y1 + i.projection.scale;
                    
                    i.blocks[block_x+','+block_y] = block;
                }
            }
            i.save = async () => {
                function* generator() {
                    for (let block_x = 0; block_x < i.map_size.w; ++block_x) {
                        for (let block_y = 0; block_y < i.map_size.h; ++block_y) {
                            let block_key = block_x+','+block_y;
                            let block = i.blocks[block_key];
                            yield {
                                key: block_key,
                                value: {
                                    type: block.type
                                }
                            };
                        }
                    }
                }
                const gen = generator();
                const big_json = JSON.stringify(Array.from(gen));
                const compressed_json = jsonpack.pack(big_json);
                console.log('big_json', big_json.length);
                console.log('compressed_json', compressed_json.length);
                
                function chunking(data) {
                    let start_at = 0;
                    let result = [];
                    const CHUNK_SIZE = 1048487;
                    while (start_at + CHUNK_SIZE < data.length) 
                    {
                        result.push(data.substr(start_at, CHUNK_SIZE));
                        start_at += CHUNK_SIZE;
                    }
                    if (start_at < data.length)
                        result.push(data.substr(start_at));
                    return result;
                }
                
                let chunked_data = chunking(compressed_json);
                console.log('saving...', 'blocks/meta');
                await libfirebase_firestore.setDoc(
                    libfirebase_firestore.doc(i.firestore, 'blocks/meta'), 
                    {length: chunked_data.length}
                );
                for (let k = 0; k < chunked_data.length; ++k) {
                    console.log('saving...', 'blocks/'+k);
                    await libfirebase_firestore.setDoc(
                        libfirebase_firestore.doc(i.firestore, 'blocks/'+k), 
                        {value: chunked_data[k]}
                    );
                }
                
                alert('save fnished');
            };
            i.load = async () => {
                console.log('loading...', 'blocks/meta');
                let blocks_length = (await libfirebase_firestore.getDoc(
                    libfirebase_firestore.doc(i.firestore, 'blocks/meta'),
                )).get('length');
                console.log('blocks_meta', blocks_length);
                let compressed_json = '';
                for (let k = 0; k < blocks_length; ++k) {
                    compressed_json += (await libfirebase_firestore.getDoc(
                        libfirebase_firestore.doc(i.firestore, 'blocks/'+k),
                    )).get('value');
                }
                console.log('compressed_json', compressed_json.length);
                const big_json = jsonpack.unpack(compressed_json);
                big_json.forEach(
                    tup => {
                        Object.assign(i.blocks[tup.key], tup.value);
                    }
                );
                
                alert('load fnished');
            };
            console.log(libfirebase_auth);
            console.log('begin>>> initializeApp');
            i.app = libfirebase_app.initializeApp(firebaseConfig);
            console.log('begin>>> initializeAuth');
            i.auth = libfirebase_auth.initializeAuth(i.app);
            console.log('begin>>> signInAnonymously');
            libfirebase_auth.signInAnonymously(i.auth).then(
                async () => {
                    i.logined = true;
                    console.log('begin>>> getFirestore');
                    i.firestore = libfirebase_firestore.getFirestore(i.app);
                    console.log('finish>>> getFirestore');
                    document.getElementById('extbtn_save').removeAttribute('disabled');
                    document.getElementById('extbtn_load').removeAttribute('disabled');
                    i.load();
                }
            );
            
        },
        event_handlers: {
            extbtn_save: (i,e) => {
                i.save();
            },
            extbtn_load: (i,e) => {
                i.load();
            },
            keydown: (i,e) => { 
                if (e.key === '[') {
                    i.ui.brush_size = Math.floor(i.ui.brush_size * 0.8);
                    if (i.ui.brush_size < 1) i.ui.brush_size = 1;
                }
                else if (e.key === ']') {
                    i.ui.brush_size = Math.ceil(i.ui.brush_size * 1.2);
                }
                else if (e.key === '`') i.ui.brush_color = 'void';
                else if (e.key === '1') i.ui.brush_color = 'ocean';
                else if (e.key === '2') i.ui.brush_color = 'deep-water';
                else if (e.key === '3') i.ui.brush_color = 'shallow-water';
                else if (e.key === '4') i.ui.brush_color = 'river';
                else if (e.key === '5') i.ui.brush_color = 'sand';
                else if (e.key === '6') i.ui.brush_color = 'green';
                else if (e.key === '7') i.ui.brush_color = 'forest';
                else if (e.key === '8') i.ui.brush_color = 'hills';
                else if (e.key === '9') i.ui.brush_color = 'mountain';
                
            },
            mousedown: (i,e) => { 
                if (e.button === 0) {
                    i.ui.is_dragged = true;
                    i.ui.drag_origin = {
                        x: i.projection.translation.x,
                        y: i.projection.translation.y,
                        mouse_x: globalThis.engine.mouse_x, 
                        mouse_y: globalThis.engine.mouse_y,
                    }; 
                }
                else if (e.button === 2) {
                    console.log(i.ui.brush_color);
                    // For the brush
                    let brush_region = {
                        x1: Math.max(0, i.ui.selected.x - Math.ceil(i.ui.brush_size)),
                        y1: Math.max(0, i.ui.selected.y - Math.ceil(i.ui.brush_size)),
                        x2: Math.min(i.map_size.w - 1, i.ui.selected.x + Math.ceil(i.ui.brush_size)),
                        y2: Math.min(i.map_size.h - 1, i.ui.selected.y + Math.ceil(i.ui.brush_size)),
                    };
                    for (let block_x = brush_region.x1; block_x <= brush_region.x2; ++block_x)
                    {
                        for (let block_y = brush_region.y1; block_y <= brush_region.y2; ++block_y)
                        {
                            let block = i.blocks[block_x+','+block_y];
                            if (length_between_x_y_x_y(block_x, block_y, i.ui.selected.x, i.ui.selected.y) < i.ui.brush_size) 
                            {
                                block.type = i.ui.brush_color;
                            }
                        }
                    }
                }
            },
            mouseup: (i,e) => { i.ui.is_dragged = false; },
            wheel: (i,e) => {
                const old_scale = i.projection.scale;
                i.projection.scale += i.projection.scale * 0.1 * e.wheelDelta / 100;
                if (i.projection.scale < 1) i.projection.scale = 1;
                const delta_scale = i.projection.scale - old_scale;
                const center = {
                    x: (globalThis.engine.screen_width / 2 - i.projection.translation.x)  / old_scale,
                    y: (globalThis.engine.screen_height / 2 - i.projection.translation.y) / old_scale,
                };
                i.projection.translation.x = i.projection.translation.x - center.x * delta_scale;
                i.projection.translation.y = i.projection.translation.y - center.y * delta_scale;
                if (delta_scale != 0) {
                    for (let block_x = 0; block_x < i.map_size.w; ++block_x) {
                        for (let block_y = 0; block_y < i.map_size.h; ++block_y) {
                            let block = i.blocks[block_x+','+block_y];
                            block.rect = {
                                x1: i.projection.translation.x + block_x * i.projection.scale,
                                y1: i.projection.translation.y + block_y * i.projection.scale,
                                x2: 0, y2: 0,
                            };
                            block.rect.x2 = block.rect.x1 + i.projection.scale;
                            block.rect.y2 = block.rect.y1 + i.projection.scale;
                        }
                    }
                }
                /*
                T1 + center * (old_scale - new_scale) = 
                e =  + block_x * 
                */
            },
        },
        onstep: i => { 
            if (i.ui.is_dragged) {
                i.projection.translation.x = i.ui.drag_origin.x + globalThis.engine.mouse_x - i.ui.drag_origin.mouse_x;
                i.projection.translation.y = i.ui.drag_origin.y + globalThis.engine.mouse_y - i.ui.drag_origin.mouse_y;
                for (let block_x = 0; block_x < i.map_size.w; ++block_x) {
                    for (let block_y = 0; block_y < i.map_size.h; ++block_y) {
                        let block = i.blocks[block_x+','+block_y];
                        block.rect = {
                            x1: i.projection.translation.x + block_x * i.projection.scale,
                            y1: i.projection.translation.y + block_y * i.projection.scale,
                            x2: 0, y2: 0,
                        };
                        block.rect.x2 = block.rect.x1 + i.projection.scale;
                        block.rect.y2 = block.rect.y1 + i.projection.scale;
                    }
                }
            }
            i.ui.selected.x = Math.floor((globalThis.engine.mouse_x - i.projection.translation.x) / i.projection.scale);
            i.ui.selected.y = Math.floor((globalThis.engine.mouse_y - i.projection.translation.y) / i.projection.scale);
        },
        ondraw: (i, ctx) => {
            let screen_rect = {
                x1: 0, y1: 0,
                x2: globalThis.engine.screen_width,
                y2: globalThis.engine.screen_height, 
            };
            for (let block_x = 0; block_x < i.map_size.w; ++block_x) {
                let chunk_x = Math.floor(block_x / i.chunk_size);
                for (let block_y = 0; block_y < i.map_size.h; ++block_y) {
                    let chunk_y = Math.floor(block_y / i.chunk_size);
                    const block = i.blocks[block_x+','+block_y];
                    
                    if (check_collision_aabb_aabb(screen_rect, block.rect)) {
                        
                        
                        /* ocean, deep-water, shallow-water, river, 
                           sand, green, forest, hills, mountain, 
                        */
                        //if (block.type === 'ocean') 
                        if (block.type === 'void')               ctx.fillStyle = "rgba(255, 255, 255, " + block.a + ")";
                        else if (block.type === 'ocean')         ctx.fillStyle = '#144a85';
                        else if (block.type === 'deep-water')    ctx.fillStyle = '#146b85';
                        else if (block.type === 'shallow-water') ctx.fillStyle = '#3bb1d4';
                        else if (block.type === 'river')         ctx.fillStyle = '#2aa891';
                        else if (block.type === 'sand')          ctx.fillStyle = '#dbce8a';
                        else if (block.type === 'green')         ctx.fillStyle = '#167033';
                        else if (block.type === 'forest')        ctx.fillStyle = '#044017';
                        else if (block.type === 'hills')         ctx.fillStyle = '#332c23';
                        else if (block.type === 'mountain')      ctx.fillStyle = '#5c5a58';
                            
                        ctx.fillRect(block.rect.x1, block.rect.y1, i.projection.scale, i.projection.scale);
                    }
                }
            }
            // For the brush
            let brush_region = {
                x1: Math.max(0, i.ui.selected.x - Math.ceil(i.ui.brush_size)),
                y1: Math.max(0, i.ui.selected.y - Math.ceil(i.ui.brush_size)),
                x2: Math.min(i.map_size.w - 1, i.ui.selected.x + Math.ceil(i.ui.brush_size)),
                y2: Math.min(i.map_size.h - 1, i.ui.selected.y + Math.ceil(i.ui.brush_size)),
            };
            for (let block_x = brush_region.x1; block_x <= brush_region.x2; ++block_x)
            {
                for (let block_y = brush_region.y1; block_y <= brush_region.y2; ++block_y)
                {
                    const block = i.blocks[block_x+','+block_y];
                    if (length_between_x_y_x_y(block_x, block_y, i.ui.selected.x, i.ui.selected.y) < i.ui.brush_size) 
                    {
                        ctx.fillStyle = "rgba(255, 0, 255, 0.33)";
                        ctx.fillRect(block.rect.x1, block.rect.y1, i.projection.scale, i.projection.scale);
                    }
                }
            }
        },
    }); 
    
    globalThis.engine.instance_create(new libengine_gameinstance.GameInstance(go_Sys1));
    let canvas = document.getElementById("canvas");
    window.onmousemove = (e) => {
        globalThis.engine.mouse_x = e.clientX - canvas.offsetLeft;
        globalThis.engine.mouse_y = e.clientY - canvas.offsetTop;  
    };
    window.onmousedown = (e) => globalThis.engine.push_event(e);
    window.onkeydown = (e) => globalThis.engine.push_event(e);
    window.onmouseup = (e) => globalThis.engine.push_event(e);
    window.onmousewheel = (e) => globalThis.engine.push_event(e);
    document.getElementById('extbtn_save').onclick = () => {
        globalThis.engine.push_event({
            type: 'extbtn_save'
        });
    };
    document.getElementById('extbtn_load').onclick = () => {
        globalThis.engine.push_event({
            type: 'extbtn_load'
        });
    };
    globalThis.engine.start();
    
};