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
        base_color: {r: 0, g: 0, b: 0, a: 0.5},
        command_queue: [],
    };
    Object.assign(emit, props);
    env.emit_id += 1;
    
    return emit;
}

export function step_emits(env)
{
    for (let emit of env.emits)
    {
        if (emit.command_queue.length > 0)
        {
            let command = emit.command_queue[0];
            if (command.type === 'morph')
            {
                if (command.initial_data === undefined)
                {
                    command.duration = Math.ceil(command.duration);
                    command.initial_data = {
                        left_tick: command.duration,
                        speed_factor: 1,
                    };
                    if (command.x !== undefined)
                        command.initial_data.dx = (command.x - emit.x) / command.duration;
                    if (command.y !== undefined)
                        command.initial_data.dy = (command.y - emit.y) / command.duration;
                    if (command.w !== undefined)
                        command.initial_data.dw = (command.w - emit.w) / command.duration;
                    if (command.h !== undefined)
                        command.initial_data.dh = (command.h - emit.h) / command.duration;
                    
                    if (command.color !== undefined)
                    {
                        command.initial_data.color = {
                            r: (command.color.r - emit.base_color.r) / command.duration,
                            g: (command.color.g - emit.base_color.g) / command.duration,
                            b: (command.color.b - emit.base_color.b) / command.duration,
                            a: (command.color.a - emit.base_color.a) / command.duration,
                        }
                    }
                }
                
                if (command.initial_data.dx !== undefined)
                    emit.x += command.initial_data.dx * command.initial_data.speed_factor;
                if (command.initial_data.dy !== undefined)
                    emit.y += command.initial_data.dy * command.initial_data.speed_factor;
                if (command.initial_data.dw !== undefined)
                    emit.w += command.initial_data.dw * command.initial_data.speed_factor;
                if (command.initial_data.dh !== undefined)
                    emit.h += command.initial_data.dh * command.initial_data.speed_factor;
                    
                if (command.initial_data.color !== undefined)
                {
                    emit.base_color.r += command.initial_data.color.r * command.initial_data.speed_factor;
                    emit.base_color.g += command.initial_data.color.g * command.initial_data.speed_factor;
                    emit.base_color.b += command.initial_data.color.b * command.initial_data.speed_factor;
                    emit.base_color.a += command.initial_data.color.a * command.initial_data.speed_factor;
                }
                    
                command.initial_data.left_tick -= 1;
                if (command.initial_data.left_tick <= 0)
                    emit.command_queue = emit.command_queue.slice(1);
            }
            else if (command.type === 'function')
            {
                command.callback(emit);
                emit.command_queue = emit.command_queue.slice(1);
            }
        }
    }
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
        ctx.closePath();
        ctx.fillStyle = libmathutil.rgba_to_hex(emit.base_color);
        ctx.fill();
    }
}