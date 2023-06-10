export class GameObject {
    constructor(object_name, props) {
        this.object_name = object_name;
        this.oninit = null;
        this.onstep = null;
        this.ondraw = null;
        this.ondestroy = null;
        this.event_handlers = {};
        this.default_values = null;
        
        if (props !== undefined)
            Object.entries(props).forEach(
                (e) => {
                    const key = e[0];
                    const value = e[1];
                    this[key] = value;
                }
            );
        engine.gameobjects[this.object_name] = this;
    };
};
