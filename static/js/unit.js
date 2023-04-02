export function create_unit(props) {
    let unit = {
        x: 0,
        y: 0,
        screenX: 0,
        screenY: 0,
        w: 100,
        h: 100,
        move_speed: 5,
        selected: false,
        command_queue:[],
    };
    Object.assign(unit, props);
    return unit;
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
                unit.x += dx;
                unit.y += dy;
                if (length < 1) unit.command_queue = unit.command_queue.slice(1);
            }
        }
    }
}

export function draw_units(ctx, env) {
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, env.screen_width, env.screen_height);
    
    for (let unit of env.units)
    {
        unit.screenX = unit.x - unit.w / 2;
        unit.screenY = unit.y - unit.h / 2;
        ctx.fillStyle = 'black';
        ctx.fillRect(
            unit.screenX, unit.screenY,
            unit.w, unit.h,
        );
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