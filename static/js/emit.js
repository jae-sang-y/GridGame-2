import * as libmathutil from "/js/mathutil.js";

export function create_emit(env, props) {
    let emit = {
        id: env.emit_id,
        x: 0,
        y: 0,
        screenX: 0,
        screenY: 0,
        w: 100,
        h: 100,
        move_speed: 5,
        base_color: {r: 0, g: 0, b: 0},
        
    };
    Object.assign(emit, props);
    env.emit_id += 1;
    
    return emit;
}

export function step_emits(env)
{
    
}


export function draw_emits(ctx, env)
{
    for (let emit of env.emits)
    {
        emit.screenX = emit.x - emit.w / 2;
        emit.screenY = emit.y - emit.h / 2;
        
        ctx.beginPath();
        for (let times = 0; times <= 16; ++times)
        {
            let pos = {
              x: emit.x + Math.cos(Math.PI * 2.0 * times / 16) * emit.w,
              y: emit.y + Math.sin(Math.PI * 2.0 * times / 16) * emit.h,
            };
            if (times == 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
        }
        ctx.fillStyle = libmathutil.rgba_to_hex(emit.base_color, 50);
        ctx.closePath();
        ctx.fill();
    }
}