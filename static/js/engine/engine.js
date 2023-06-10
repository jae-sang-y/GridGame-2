import * as libengine_gameobject from "/js/engine/gameobject.js";
export class Engine {
    constructor() {
        this.gameobjects = {};
        this.gameinstances = [];
        this.event_queue = [];
        this.newborn_gameinstances = [];
        this.total_tick = 0;
        this.mouse_x = 0;
        this.mouse_y = 0;
        
        let canvas = document.getElementById("canvas");
        this.ctx = canvas.getContext("2d");
        this.screen_width = Number(canvas.getAttribute('width'));
        this.screen_height = Number(canvas.getAttribute('height'));
    };
    start() {
        setTimeout(() => this.loop(), 1);
    };
    draw(ctx) {
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillRect(0, 0, this.screen_width, this.screen_height);
        this.gameinstances.forEach(i => { if (i.gameobject.ondraw !== null) i.gameobject.ondraw(i, this.ctx); });
    }
    push_event(e) {
        this.event_queue.push(e);
    }
    instance_create(i) {
        this.newborn_gameinstances.push(i);
    }
    instance_destroy(i) {
        i.will_destory = true;
    }
    loop() {
        ++this.total_tick;
        // Begin of Loop
        {
            // Assign newborn objects
            this.newborn_gameinstances.forEach(i => { if (i.gameobject.oninit !== null) i.gameobject.oninit(i); });
            this.gameinstances = this.gameinstances.concat(this.newborn_gameinstances);
            this.newborn_gameinstances.length = 0;
            
            // Process an event queue
            this.event_queue.forEach(e => {
                this.gameinstances.forEach(i => {
                    if (i.gameobject.event_handlers[e.type] !== undefined)
                        i.gameobject.event_handlers[e.type](i, e);
                });
            });
            this.event_queue.length = 0;
            
            // Process step and draw procedures
            this.gameinstances.forEach(i => { if (i.gameobject.onstep !== null) i.gameobject.onstep(i); });
            this.draw(this.ctx);
            
            // Destory objects will be destroyed
            this.gameinstances.forEach(i => { if (i.will_destory === true && i.gameobject.ondraw !== null) i.gameobject.ondestroy(i); });
            this.gameinstances = this.gameinstances.filter(i => i.will_destory !== false);
        }
        // End of Loop
        setTimeout(() => this.loop(), 1);
    };
};
