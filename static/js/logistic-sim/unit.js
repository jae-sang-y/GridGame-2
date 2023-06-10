import * as libmathutil from "/js/mathutil.js";
import * as libemit from "/js/emit.js";

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
        move_angle_speed: 0.1,
        move_angle_target: 0,
        move_angle: 0,
        diff_angle: 0,
        selected: false,
        command_queue:[],
        forced_move: { x: 0, y: 0 },
        time_after_last_forced_move: 0,
        owner: null,
        base_color: {r: 0, g: 0, b: 0},
        attack_left_cooldown: 0,
        attack_cooldown: 20,
        attack_damage: 20,
        attack_type: 'melee',
        defensiveness: 1,
        // side length = 20 + sqrt(health)
        health: 1600,
        sight_range: 200,
        missile_speed: 2,
        missile_stage: 100,
        missile_damage_range: 80,
        unit_icon_name: '보병',
        
    };
    Object.assign(unit, props);
    env.unit_id += 1;
    
    unit.attack_damage_per_health = unit.attack_damage / unit.health;
    unit.w = Math.ceil(20 + Math.sqrt(unit.health));
    unit.h = unit.w;
    unit.move_angle_target = unit.move_angle;
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
                    
                    if (times === 0)
                    {
                        attack_units(env, unit, collided_unit);
                    }
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

export function attack_units(env, attacker, defender) {
    if (attacker.attack_left_cooldown > 0) return;
    if (attacker.owner === defender.owner) return;
    attacker.attack_left_cooldown = attacker.attack_cooldown;
    
    defender.health -= attacker.attack_damage_per_health * attacker.health / defender.defensiveness;
    defender.w = Math.ceil(20 + Math.sqrt(defender.health));
    defender.h = defender.w;
}

export function attack_units_range(env, attacker, defender) {
    defender.health -= attacker.attack_damage_per_health * attacker.health / defender.defensiveness;
    defender.w = Math.ceil(20 + Math.sqrt(defender.health));
    defender.h = defender.w;
}

export function step_units(env) {
    
    for (let unit of env.units)
    {
        let diff_angle = libmathutil.diff_from_to_angles(unit.move_angle_target, unit.move_angle);
        unit.diff_angle = diff_angle;
        
        if (diff_angle > 0)
        {
            unit.move_angle += Math.min(unit.move_angle_speed, +diff_angle);
        }
        else if (diff_angle < 0)
        {
            unit.move_angle -= Math.min(unit.move_angle_speed, -diff_angle);
        }
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
                unit.move_angle_target = Math.atan2(dy, dx);
                if (Math.abs(unit.diff_angle) <= 0.01)
                    move_unit(env, unit, dx, dy);
                if (command.left_time !== undefined) command.left_time -= 1;
                if (length < 5 || command.left_time === 0) unit.command_queue = unit.command_queue.slice(1);
                
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
                    unit.move_angle_target = Math.atan2(dy, dx);
                    move_unit(env, unit, dx, dy);
                }
                else unit.move_angle_target = command.angle;
            }
            else if (command.name == 'formation')
            {
                let length = libmathutil.length_between_points(
                    unit.x, unit.y, command.x, command.y
                );
                if (length > 2 && unit.time_after_last_forced_move > command.delay)
                {
                    command.delay = Math.floor(Math.random() * 100);
                    unit.command_queue = [
                        create_command(
                            'move',
                            {x: command.x, y: command.y}
                        )
                    ].concat(unit.command_queue);
                }
                else
                    unit.move_angle_target = command.angle;
            }
        }
        
        {
            if (unit.command_queue.length > 0 && (
                unit.command_queue[0].force === true
                )
            )
            {
                // pass
            }
            else
            {
                let new_command = null;
                let last_distance = null;
                for (let other of env.units)
                {
                    if (unit.id === other.id) continue;
                    if (unit.owner === other.owner) continue;
                    let distance = Math.pow(
                        Math.pow(unit.x - other.x, 2) + 
                        Math.pow(unit.y - other.y, 2),
                        0.5
                    );
                    if (distance <= unit.sight_range && (last_distance === null || last_distance > distance))
                    {
                        last_distance = distance;
                        if (unit.attack_type === 'melee')
                        {
                            new_command = create_command(
                                'move',
                                {x: other.x, y: other.y, left_time: 10, force: true}
                            );
                        }
                        else
                        {
                            
                            if (unit.attack_left_cooldown === 0) 
                            {
                                let length = libmathutil.length_between_points(
                                    unit.x, unit.y,
                                    other.x, other.y
                                );
                                let length_per_tick = unit.missile_speed;
                                unit.attack_left_cooldown = unit.attack_cooldown;
                                let command_queue = [];
                                
                                let shoot_angle = 30 *(Math.PI/180);
                                let velocity_height = Math.sin(shoot_angle);
                                let stage = unit.missile_stage; 
                                let gravity_constant = 2*velocity_height;
                                let damage_range = unit.missile_damage_range;
                                let expansion_size = 30;
                                for (let time = 0; time < 1; time += 1 / stage) 
                                {
                                    let h = velocity_height*time-gravity_constant*Math.pow(time,2)/2;
                                    command_queue.push({
                                        type: 'morph', 
                                        x: unit.x * (1-time) + other.x * time,
                                        y: unit.y * (1-time) + other.y * time,
                                        duration: length/stage/length_per_tick,
                                        w: 5*(1+h * expansion_size), 
                                        h: 5*(1+h * expansion_size)
                                    });
                                }
                                command_queue.push({
                                    type: 'morph', duration: 20,
                                    w: damage_range, h: damage_range,
                                    color: {r:255, g:0, b:0, a:0},
                                });
                                command_queue.push({
                                    type: 'function',
                                    callback: emit => {
                                        for (let other of env.units) {
                                            let length = libmathutil.length_between_points(
                                                emit.x, emit.y,
                                                other.x, other.y
                                            );
                                            if (length < damage_range) {
                                                attack_units_range(env, unit, other);
                                            }
                                        }
                                    }
                                });
                                env.emits.push(
                                    libemit.create_emit(
                                        env, 
                                        {
                                            x: unit.x, y: unit.y,
                                            base_color: {r:40,g:40,b:40,a:0.75},
                                            w: 5, h: 5,
                                            command_queue: command_queue
                                        }
                                    )
                                );
                            }
                        }
                    }
                }
                if (new_command !== null)
                    unit.command_queue = [new_command].concat(unit.command_queue);
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
        if (unit.attack_left_cooldown > 0)
            unit.attack_left_cooldown -= 1;
    }
    env.units = env.units.filter(unit => unit.health > 0);
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
                if (command.force === true)
                    ctx.fillStyle = 'red';
            }
        }
        ctx.fill();
        if (unit.attack_left_cooldown > 0)
        {
            let cooldown_size = unit.attack_left_cooldown / unit.attack_cooldown;
            ctx.beginPath();
            ctx.moveTo(
                unit.x + Math.cos(unit.move_angle) * 15, 
                unit.y + Math.sin(unit.move_angle) * 15
            );
            ctx.lineTo(
                unit.x + Math.cos(unit.move_angle + Math.PI/2) * 10 * cooldown_size - Math.cos(unit.move_angle) * 10 * cooldown_size, 
                unit.y + Math.sin(unit.move_angle + Math.PI/2) * 10 * cooldown_size - Math.sin(unit.move_angle) * 10 * cooldown_size
            );
            ctx.lineTo(
                unit.x + Math.cos(unit.move_angle - Math.PI/2) * 10 * cooldown_size - Math.cos(unit.move_angle) * 10 * cooldown_size, 
                unit.y + Math.sin(unit.move_angle - Math.PI/2) * 10 * cooldown_size - Math.sin(unit.move_angle) * 10 * cooldown_size
            );
            ctx.fillStyle = '#404040';
            ctx.fill();
        }
        
        
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
        
        ctx.drawImage(env.img.unit[unit.unit_icon_name], 0, 0, 16, 12, unit.screenX, unit.screenY, 16, 12);
    
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