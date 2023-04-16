 export function length_between_points(x1, y1, x2, y2) 
 {
     return Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 0.5);
 }
 
 export function length_of_vector(vec)
 {
     return length_between_points(0, 0, vec.x, vec.y);
 }
 
 export function normalize_vector(vec)
 {
     let length = length_between_points(0, 0, vec.x, vec.y);
     return {
        x: vec.x / length, 
        y: vec.y / length,
     };
 }
 
 
 export function add_vector(vec1, vec2)
 {
     return {
        x: vec1.x + vec2.x, 
        y: vec1.y + vec2.y,
     };
 }
 

 export function sub_vector(vec1, vec2)
 {
     return {
        x: vec1.x - vec2.x, 
        y: vec1.y - vec2.y,
     };
 }
 

 export function mul_vector(vec, c)
 {
     return {
        x: vec.x * c, 
        y: vec.y * c,
     };
 }
 
export function rotate_vector(vec, c)
{
    let angle = Math.atan2(vec.y, vec.x) + c;
    let length = length_between_points(0, 0, vec.x, vec.y);
    return {
        x: Math.cos(angle) * length, 
        y: Math.sin(angle) * length,
     };
}
 
 export function rgb_to_hex(rgb)
 {
   return 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
 }
 
 export function rgba_to_hex(rgba)
 {
   return 'rgba(' + rgba.r + ',' + rgba.g + ',' + rgba.b + ',' + rgba.a + ')';
 }
 
 
 export function diff_from_to_angles(a, b)
 {
    let diff_angle = a - b;
    while (diff_angle > +Math.PI) diff_angle -= 2 * Math.PI;
    while (diff_angle < -Math.PI) diff_angle += 2 * Math.PI;
    return diff_angle;
 }