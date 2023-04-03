import * as libmathutil from "/js/mathutil.js";

export function create_unit(env, props) {
    let unit = {
        id: env.unit_id,
        x: 0,
        y: 0,
        screenX: 0,
        screenY: 0,
        w: 100,
        h: 100,
        move_speed: 5,
        move_angle: 0,
        selected: false,
        command_queue:[],
        forced_move: { x: 0, y: 0 },
        time_after_last_forced_move: 0,
        base_color: {r: 0, g: 0, b: 0},
    };
    Object.assign(unit, props);
    env.unit_id += 1;
    return unit;
}

function move_unit(env, unit, dx, dy)
{
    let step = Math.ceil(
        Math.max(
            Math.abs(dx), Math.abs(dy)
        )
    );
    
    
    for (let times = 0; times < step; ++ times)
    {
        let ddx = Math.min(1, Math.abs(dx)) * Math.sign(dx);
        let ddy = Math.min(1, Math.abs(dy)) * Math.sign(dy);
        
        let collided_units = find_units_by_region(env.units, 
            unit.x - unit.w / 2 + ddx, unit.y - unit.h / 2 + ddy,
            unit.x + unit.w / 2 + ddx, unit.y + unit.h / 2 + ddy,
        ).filter(collided_unit => collided_unit.id !== unit.id );
        
        let scale = 1;
        if (collided_units.length > 0)
        {
            collided_units.forEach(
                collided_unit => {
                    let force = {
                        x: collided_unit.x - unit.x,
                        y: collided_unit.y - unit.y,
                    };
                    force = libmathutil.normalize_vector(force);
                    collided_unit.forced_move = libmathutil.add_vector(
                        collided_unit.forced_move, force
                    );
                    unit.forced_move = libmathutil.sub_vector(
                        unit.forced_move, force
                    );
                    collided_unit.time_after_last_forced_move = 0;
                }
            );
            scale /= 10;
        }
        ddx *= scale;
        ddy *= scale;
        unit.x += ddx;
        unit.y += ddy;
        dx -= ddx;
        dy -= ddy;
        
        if (unit.x - unit.w / 2 < 0)
            unit.x = unit.w / 2;
            
        if (unit.y - unit.h / 2 < 0)
            unit.y = unit.h / 2;
            
        if (unit.x + unit.w / 2 > env.screen_width)
            unit.x = - unit.w / 2 + env.screen_width;
            
        if (unit.y + unit.h / 2 > env.screen_height)
            unit.y = - unit.h / 2 + env.screen_height;
    }
}

export function step_units(env) {
    
    for (let unit of env.units)
    {
        if (unit.command_queue.length > 0)
        {
            let command = unit.command_queue[0];
            if (command.name === 'move')
            {
                let dx = command.x - unit.x;
                let dy = command.y - unit.y;
                let length = Math.pow(Math.pow(dx, 2) + Math.pow(dy, 2), 0.5);
                if (length > unit.move_speed)
                {
                    dx /= length / unit.move_speed;
                    dy /= length / unit.move_speed;
                }
                unit.move_angle = Math.atan2(dy, dx);
                move_unit(env, unit, dx, dy);
                if (length < 5) unit.command_queue = unit.command_queue.slice(1);
            }
            else if (command.name === 'fix_position')
            {
                let dx = command.x - unit.x;
                let dy = command.y - unit.y;
                let length = Math.pow(Math.pow(dx, 2) + Math.pow(dy, 2), 0.5);
                if (length > unit.move_speed)
                {
                    dx /= length / unit.move_speed;
                    dy /= length / unit.move_speed;
                }
                if (length >= 1)
                {   
                    unit.move_angle = Math.atan2(dy, dx);
                    move_unit(env, unit, dx, dy);
                }
                else unit.move_angle = command.angle;
            }
            else if (command.name == 'formation')
            {
                let length = libmathutil.length_between_points(
                    unit.x, unit.y, command.x, command.y
                );
                if (length > 2 && unit.time_after_last_forced_move > 10 + command.delay)
                {
                    unit.command_queue = [
                        create_command(
                            'move',
                            {x: command.x, y: command.y}
                        )
                    ].concat(unit.command_queue);
                }
                else
                    unit.move_angle = command.angle;
            }
        }
        {
            let dx = unit.forced_move.x;
            let dy = unit.forced_move.y;
            let length = Math.pow(Math.pow(dx, 2) + Math.pow(dy, 2), 0.5);
            if (length >= 0.1)
            {
                if (length > unit.move_speed)
                {
                    dx /= length / unit.move_speed;
                    dy /= length / unit.move_speed;
                }
                move_unit(env, unit, dx, dy);
                unit.forced_move.x /= 2;
                unit.forced_move.y /= 2;
            }
        }
        unit.time_after_last_forced_move += 1;
    }
}

export function draw_units(ctx, env) {
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, env.screen_width, env.screen_height);
    
    for (let unit of env.units)
    {
        unit.screenX = unit.x - unit.w / 2;
        unit.screenY = unit.y - unit.h / 2;
        ctx.fillStyle = libmathutil.rgb_to_hex(unit.base_color);
        ctx.fillRect(
            unit.screenX, unit.screenY,
            unit.w, unit.h,
        );
        
        ctx.beginPath();
        ctx.moveTo(
            unit.x + Math.cos(unit.move_angle) * 15, 
            unit.y + Math.sin(unit.move_angle) * 15
        );
        ctx.lineTo(
            unit.x + Math.cos(unit.move_angle + Math.PI/2) * 10 - Math.cos(unit.move_angle) * 10, 
            unit.y + Math.sin(unit.move_angle + Math.PI/2) * 10 - Math.sin(unit.move_angle) * 10
        );
        ctx.lineTo(
            unit.x + Math.cos(unit.move_angle - Math.PI/2) * 10 - Math.cos(unit.move_angle) * 10, 
            unit.y + Math.sin(unit.move_angle - Math.PI/2) * 10 - Math.sin(unit.move_angle) * 10
        );
        ctx.fillStyle = 'gray';
        if (unit.command_queue.length > 0)
        {
            let command = unit.command_queue[0];
            if (command.name === 'move')
            {
                ctx.fillStyle = 'green';
            }
        }
        ctx.fill();
        
        
        if (unit.command_queue.length > 0)
        {
            let command = unit.command_queue[0];
            if (command.name === 'fix_position')
            {
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'red';
                ctx.beginPath();
                ctx.moveTo(
                    unit.x + 0.6 * Math.cos(unit.move_angle) * 15, 
                    unit.y + 0.6 * Math.sin(unit.move_angle) * 15
                );
                ctx.lineTo(
                    unit.x + 0.6 * (Math.cos(unit.move_angle + Math.PI/2) * 10 - Math.cos(unit.move_angle) * 10), 
                    unit.y + 0.6 * (Math.sin(unit.move_angle + Math.PI/2) * 10 - Math.sin(unit.move_angle) * 10)
                );
                ctx.lineTo(
                    unit.x + 0.6 * (Math.cos(unit.move_angle - Math.PI/2) * 10 - Math.cos(unit.move_angle) * 10), 
                    unit.y + 0.6 * (Math.sin(unit.move_angle - Math.PI/2) * 10 - Math.sin(unit.move_angle) * 10)
                );
                ctx.closePath();
                ctx.stroke();
            }
        }
        
        if (unit.selected) 
        {
            ctx.strokeStyle = 'green';
            ctx.lineWidth = (unit.w + unit.h) / 20;
            ctx.strokeRect(
                unit.screenX, unit.screenY,
                unit.w, unit.h,
            );
        }
    }
}

export function find_units_by_point(units, X, Y) 
{
    let result = [];
    for (let unit of units)
    {
        if (
            unit.screenX <= X && unit.screenX + unit.w >= X &&
            unit.screenY <= Y && unit.screenY + unit.h >= Y
        )
        {
            result.push(unit);
        }
    }
    return result;
}

export function find_units_by_region(units, x1, y1, x2, y2) 
{
    let minX, maxX, minY, maxY;
    if (x1 < x2)
    {
        minX = x1;
        maxX = x2;
    }
    else
    {
        minX = x2;
        maxX = x1;
    }
    
    if (y1 < y2)
    {
        minY = y1;
        maxY = y2;
    }
    else
    {
        minY = y2;
        maxY = y1;
    }
    
    let result = [];
    for (let unit of units)
    {
        if (
            unit.screenX <= maxX && unit.screenX + unit.w >= minX &&
            unit.screenY <= maxY && unit.screenY + unit.h >= minY
        )
        {
            result.push(unit);
        }
    }
    return result;
}

export function find_nearest_unit_by_point(units, X, Y) 
{
    let nearest_unit = null;
    let nearest_length = 0;
    for (let unit of units)
    {
        let length = libmathutil.length_between_points(
            X, Y, unit.x, unit.y
        );
        if (length < nearest_length || nearest_unit === null)
        {
            console.log('length under', length, nearest_length);
            nearest_length = length;
            nearest_unit = unit;
        }
        else console.log('length over', length, nearest_length);
    }
    return nearest_unit;
}

export function create_command(command_name, props) {
    let command = {
        name: command_name,
        x: 0,
        y: 0,
    };
    Object.assign(command, props);
    return command;
}