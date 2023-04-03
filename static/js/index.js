const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const env = {
    screen_width: 1024,
    screen_height: 768,
    ui_scroll_rect_valid: false,
    ui_scrolling: null,
    ui_scroll_rect: { x1:null, y1:null, x2:null, y2: null },
    ui_scroll_formation_depth: null,
    ui_scroll_formation_width: null,
    ui_scroll_formation_count: null,
    ui_scroll_interval_distance: {x:0, y:0},
    units: [],
    unit_id: 0,
}

import * as libunit from "/js/unit.js";
import * as libmathutil from "/js/mathutil.js";



function init() {
    
    for (let x = 0; x < 15; ++x)
    {
        env.units.push(
            libunit.create_unit(
                env, 
                {
                    x: 100 + x * 60, y: 200, w: 40, h: 40, move_angle: Math.PI * 1/2,
                    base_color: { r: 130,  g: 0, b: 0 },
                }
            )
        );  
        env.units.push(
            libunit.create_unit(
                env, 
                {
                    x: 100 + x * 60, y: 500, w: 40, h: 40, move_angle: Math.PI * 3/2,
                    base_color: { r: 78,  g: 80, b: 108 },
                }
            )
        );  
    }
    canvas.onmousedown = onmousedown;
    canvas.onmousemove = onmousemove;
    canvas.onmouseup = onmouseup;
    document.onkeydown = onkeydown;
    setInterval(main, 10);
}

function draw() {
    libunit.draw_units(ctx, env);
    
    if (env.ui_scroll_rect_valid)
    {
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 4;
        if (env.ui_scrolling === 'aabb')
        {
            ctx.strokeRect(
                env.ui_scroll_rect.x1,
                env.ui_scroll_rect.y1,
                env.ui_scroll_rect.x2 - env.ui_scroll_rect.x1,
                env.ui_scroll_rect.y2 - env.ui_scroll_rect.y1,
            );
        }
        else if (env.ui_scrolling === 'oobb')
        {
            ctx.beginPath();
            let axis_org = {
                x: env.ui_scroll_rect.x2 - env.ui_scroll_rect.x1,
                y: env.ui_scroll_rect.y2 - env.ui_scroll_rect.y1,
            };
            let axis_x = libmathutil.normalize_vector(axis_org);
            let axis_y = libmathutil.rotate_vector(axis_x, Math.PI / 2);
            
            let points = [
                {x: env.ui_scroll_rect.x1, y: env.ui_scroll_rect.y1},
                {x: env.ui_scroll_rect.x2, y: env.ui_scroll_rect.y2},
                {x: env.ui_scroll_rect.x2, y: env.ui_scroll_rect.y2},
            ];
            let x_gap = 0;
            if (env.ui_scroll_formation_width > 1)
            {
                x_gap = (libmathutil.length_of_vector(axis_org) - 50) / (env.ui_scroll_formation_width - 1);
            }
            let y_gap = x_gap;
            let the_other_side_length = y_gap * env.ui_scroll_formation_depth;

            points[2] = libmathutil.add_vector(
                points[1], libmathutil.mul_vector(axis_y, the_other_side_length)
            );
            points[3] = libmathutil.add_vector(
                points[0], libmathutil.mul_vector(axis_y, the_other_side_length)
            );
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.lineTo(points[2].x, points[2].y);
            ctx.lineTo(points[3].x, points[3].y);
            ctx.closePath();
            ctx.stroke();
            
            let left_count = env.ui_scroll_formation_count;
            for (let y = 0; y < env.ui_scroll_formation_depth && left_count > 0; ++y)
            {
                for (let x = 0; x < env.ui_scroll_formation_width && left_count > 0; ++x, --left_count)
                {
                    let pos = libmathutil.add_vector(
                        libmathutil.add_vector(
                            points[0], libmathutil.mul_vector(axis_x, x_gap * x + 25)
                        )
                        , libmathutil.mul_vector(axis_y, y_gap * y + 25)
                    );
                    
                    let unit_points = [];
                    unit_points.push(
                        libmathutil.add_vector(
                            pos, libmathutil.mul_vector(axis_y, -15)
                        )
                    );
                    unit_points.push(
                        libmathutil.add_vector(
                            libmathutil.add_vector(
                                pos, libmathutil.mul_vector(axis_x, +10)
                            ), libmathutil.mul_vector(axis_y, 10)
                        )
                    );
                    unit_points.push(
                        libmathutil.add_vector(
                            libmathutil.add_vector(
                                pos, libmathutil.mul_vector(axis_x, -10)
                            ), libmathutil.mul_vector(axis_y, 10)
                        )
                    );
                    
                    ctx.beginPath();
                    ctx.moveTo(unit_points[0].x, unit_points[0].y);
                    ctx.lineTo(unit_points[1].x, unit_points[1].y);
                    ctx.lineTo(unit_points[2].x, unit_points[2].y);
                    ctx.closePath();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'green';
                    ctx.stroke();
                }
            }
        }
        
    }
}

function main() {
    libunit.step_units( env);
    
    draw();
    
}

function onmousedown(e)
{
    e.preventDefault();
    e.stopPropagation();
    
    if (e.button === 0)
    {
        env.ui_scrolling = 'aabb';
        env.ui_scroll_rect_valid = false;
        env.ui_scroll_rect = {
          x1: e.offsetX,
          y1: e.offsetY,
          x2: null,
          y2: null,
        };
    }
    else
    {
        env.ui_scroll_rect_valid = false;
        let selected_units = env.units.filter(unit => unit.selected);
        if (selected_units.length > 1)
        {
            env.ui_scrolling = 'oobb';
            env.ui_scroll_rect_valid = false;
            env.ui_scroll_formation_depth = 0;
            env.ui_scroll_formation_width = 0;
            env.ui_scroll_formation_count = selected_units.length;
            env.ui_scroll_rect = {
              x1: e.offsetX,
              y1: e.offsetY,
              x2: null,
              y2: null,
            };
        }
    }
}

function onmousemove(e)
{
    e.preventDefault();
    e.stopPropagation();
    
    if (env.ui_scrolling === 'aabb')
    {
        env.ui_scroll_rect.x2 = e.offsetX;
        env.ui_scroll_rect.y2 = e.offsetY;
        if (
            libmathutil.length_between_points(
                env.ui_scroll_rect.x1,
                env.ui_scroll_rect.y1,
                env.ui_scroll_rect.x2,
                env.ui_scroll_rect.y2,
            ) >= 32
        )
            env.ui_scroll_rect_valid = true;
        else 
            env.ui_scroll_rect_valid = false;
    }
    else if (env.ui_scrolling === 'oobb')
    {
        let length = libmathutil.length_between_points(
            env.ui_scroll_rect.x1,
            env.ui_scroll_rect.y1,
            env.ui_scroll_rect.x2,
            env.ui_scroll_rect.y2,
        );
        env.ui_scroll_rect.x2 = e.offsetX;
        env.ui_scroll_rect.y2 = e.offsetY;
        if (length >= 100)
        {
            let selected_units = env.units.filter(unit => unit.selected);
            env.ui_scroll_rect_valid = true;
            env.ui_scroll_formation_width = Math.min(Math.floor(length / 45), selected_units.length);
            env.ui_scroll_formation_depth = Math.ceil(selected_units.length / env.ui_scroll_formation_width);
        }
        else 
            env.ui_scroll_rect_valid = false;
    }
}

function onmouseup(e)
{
    e.preventDefault();
    e.stopPropagation();
    
    if (e.button === 0)
    {
        if (e.shiftKey === false)
        {
            env.units.filter(unit => unit.selected).forEach(
                (unit) => {
                    unit.selected = false;
                }
            );
        }
        
        let units = [];
        if (env.ui_scroll_rect_valid)
        {
            units = libunit.find_units_by_region(
                env.units, 
                env.ui_scroll_rect.x1,
                env.ui_scroll_rect.y1,
                env.ui_scroll_rect.x2,
                env.ui_scroll_rect.y2,
            );
            for (let unit of units)
            {
                unit.selected = !unit.selected;
            }
        }
        else
        {
            units = libunit.find_units_by_point(env.units, e.offsetX, e.offsetY);
            if (units.length > 0)
            {
                let unit = units[units.length - 1];
                unit.selected = !unit.selected;
            }
        }
    }
    else if (e.button === 2)
    {
        if (env.ui_scrolling === 'oobb' && env.ui_scroll_rect_valid)
        {
            let axis_org = {
                x: env.ui_scroll_rect.x2 - env.ui_scroll_rect.x1,
                y: env.ui_scroll_rect.y2 - env.ui_scroll_rect.y1,
            };
            let axis_x = libmathutil.normalize_vector(axis_org);
            let axis_y = libmathutil.rotate_vector(axis_x, Math.PI / 2);
            let axis_y_prime = libmathutil.rotate_vector(axis_y, Math.PI);
            
            let org = {x: env.ui_scroll_rect.x1, y: env.ui_scroll_rect.y1};
            let x_gap = 0;
            let y_gap = 50;
            if (env.ui_scroll_formation_width > 1)
            {
                x_gap = (libmathutil.length_of_vector(axis_org) - 50) / (env.ui_scroll_formation_width - 1);
                y_gap = x_gap;
            }
            
            let selected_units = env.units.filter(unit => unit.selected);
            selected_units.forEach(
                selected_unit => {
                    selected_unit.command_queue = [];
                }
            );
            let not_receive_order_units = selected_units;
            let move_angle = Math.atan2(axis_y_prime.y, axis_y_prime.x);
            
            for (let y = 0; y < env.ui_scroll_formation_depth && not_receive_order_units.length > 0; ++y)
            {
                for (let x = 0; x < env.ui_scroll_formation_width && not_receive_order_units.length > 0; ++x)
                {
                    console.log(x, y, not_receive_order_units)
                    let new_unit_pos = libmathutil.add_vector(
                        libmathutil.add_vector(
                            org, libmathutil.mul_vector(axis_x, x_gap * x + 25)
                        )
                        , libmathutil.mul_vector(axis_y, y_gap * y + 25)
                    );
                    
                    let target_unit = libunit.find_nearest_unit_by_point(
                        not_receive_order_units, new_unit_pos.x, new_unit_pos.y
                    );
                    
                    console.log('target_unit', target_unit);
                    
                    target_unit.command_queue.push(
                        libunit.create_command(
                            'move',
                            {x: new_unit_pos.x, y: new_unit_pos.y}
                        )
                    );
                    target_unit.command_queue.push(
                        libunit.create_command(
                            'formation',
                            {x: new_unit_pos.x, y: new_unit_pos.y, angle: move_angle, delay: not_receive_order_units.length % 10}
                        )
                    );
                    
                    not_receive_order_units = not_receive_order_units.filter(
                        unit => unit.command_queue.length === 0
                    );
                }
            }
        }
        else
        {
            env.units.filter(unit => unit.selected).forEach(
                (unit) => {
                    if (e.shiftKey === false)
                    {
                        unit.command_queue = [];
                    }
                    unit.command_queue.push(
                        libunit.create_command(
                            'move',
                            {x: e.offsetX, y: e.offsetY}
                        )
                    );
                }
            );
        }
    }
    
    env.ui_scrolling = null;
    env.ui_scroll_rect_valid = false;
}


function onkeydown(e)
{
    //e.preventDefault();
    e.stopPropagation();
    if (e.code === 'KeyS')
    {
         env.units.filter(unit => unit.selected).forEach(
            (unit) => {
                unit.command_queue = [];
            }
        );
    }
    else if (e.code === 'KeyH')
    {
         env.units.filter(unit => unit.selected).forEach(
            (unit) => {
                if (e.shiftKey === false)
                {
                        unit.command_queue = [];
                }
                unit.command_queue.push(
                    libunit.create_command(
                        'fix_position',
                        {x: unit.x, y: unit.y, angle: unit.move_angle}
                    )
                );
            }
        );
    }
    console.log(e);
}

init();