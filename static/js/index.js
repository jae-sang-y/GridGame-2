const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const env = {
    screen_width: 1024,
    screen_height: 768,
    ui_scroll_rect_valid: false,
    ui_scrolling: false,
    ui_scroll_rect: { x1:null, y1:null, x2:null, y2: null },
    units: [],
}

import * as libunit from "/js/unit.js";
import * as libmathutil from "/js/mathutil.js";


function create_command(command_name, props) {
    let command = {
        name: command_name,
        x: 0,
        y: 0,
    };
    Object.assign(command, props);
    return command;
}

function init() {
    env.units.push(
        libunit.create_unit({x: 100, y: 100, w: 40, h: 40})
    );
    
    for (let x = 0; x < 5; ++x)
    {
        env.units.push(
            libunit.create_unit({x: 100 + x * 100, y: 200, w: 40, h: 40})
        );  
    }
    canvas.onmousedown = onmousedown;
    canvas.onmousemove = onmousemove;
    canvas.onmouseup = onmouseup;
    setInterval(main, 10);
}

function draw() {
    libunit.draw_units(ctx, env);
    
    if (env.ui_scroll_rect_valid)
    {
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 4;
        ctx.strokeRect(
            env.ui_scroll_rect.x1,
            env.ui_scroll_rect.y1,
            env.ui_scroll_rect.x2 - env.ui_scroll_rect.x1,
            env.ui_scroll_rect.y2 - env.ui_scroll_rect.y1,
        );
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
        env.ui_scrolling = true;
        env.ui_scroll_rect_valid = false;
        env.ui_scroll_rect = {
          x1: e.offsetX,
          y1: e.offsetY,
          x2: null,
          y2: null,
        };
    }
}

function onmousemove(e)
{
    e.preventDefault();
    e.stopPropagation();
    
    if (env.ui_scrolling)
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
        env.units.filter(unit => unit.selected).forEach(
            (unit) => {
                unit.command_queue.push(
                    create_command(
                        'move',
                        {x: e.offsetX, y: e.offsetY}
                    )
                );
            }
        );
    }
    
    env.ui_scrolling = false;
    env.ui_scroll_rect_valid = false;
}

init();