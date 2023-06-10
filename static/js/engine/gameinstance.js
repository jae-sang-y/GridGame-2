export class GameInstance {
    constructor(gameobject, props) {
        this.gameobject = gameobject;
        this.render_pos = {
            x: 0,
            y: 0,
            w: 32,
            h: 32  
        };
        if (props !== undefined)
            Object.entries(props).forEach(
                (e) => {
                    const key = e[0];
                    const value = e[1];
                    this[key] = value;
                }
            );
        this.will_destroy = false;
    };
};
