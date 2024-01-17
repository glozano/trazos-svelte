<script>
    import  P5  from 'p5-svelte';

    var canvas, _p5;

    let particles = [];
    const particleCount = 40;
    const maxDistance = 200;
    const maxConnections = 3;
    const minSpeed = 0.05;
    const maxSpeed = 0.25;

    const sketch = (p5) => {
        _p5 = p5;

        p5.setup = () => {
            let w = window.innerWidth;
            let h = window.innerHeight;
            canvas = p5.createCanvas(w, h);
            p5.background(0,0,0);
            for (let i = 0; i < particleCount; i++) {
                let p = new Particle();
                particles.push(p);
            }
        };

        p5.draw = () => {
            p5.background(0,0,0);
            //const particleColor = color(242, 147, 24);
            const particleColor = p5.color(0, 255, 0);
            const lineColor = p5.color(0, 255, 0);
            

            for (let i = 0; i < particles.length; i++) {
                p5.noStroke();
                p5.fill(particleColor);
                particles[i].draw();
                particles[i].update();
            }

            for (let i = 0; i < particles.length - 1; i++) {

                let current = particles[i];
                let affected = [];

                for (let j = 0; j < particles.length; j++) {
                    if (particles[j] != current) {
                        let distance = current.position.dist(particles[j].position);
                        if (distance <= maxDistance && affected.length <= maxConnections) {
                            affected.push({
                                'particle': particles[j],
                                'distance': distance
                            });
                        }
                    }
                }

                for (let a = 0; a < affected.length; a++) {
                    p5.stroke(p5.red(lineColor), p5.green(lineColor), p5.blue(lineColor), p5.map(affected[a].distance, 0, maxDistance, 255, 0));
                    //smooth();
                    p5.line(current.position.x, current.position.y, affected[a].particle.position.x, affected[a].particle.position.y);
                }

                
            }
                    
        }
        function Particle() {
            this.position = p5.createVector(p5.random(0, window.innerWidth), p5.random(0, window.innerHeight));
            this.velocity = p5.createVector(p5.random(-1, 1), p5.random(-1, 1));
            this.velocity.normalize();
            this.velocity.mult(p5.random(minSpeed, maxSpeed));

            this.update = function () {
                this.position.add(this.velocity);
                if (this.position.x < 0) this.position.x = window.innerWidth;
                if (this.position.y < 0) this.position.y = window.innerHeight;
                if (this.position.x > window.innerWidth) this.position.x = 0;
                if (this.position.y > window.innerHeight) this.position.y = 0;
            };

            this.draw = function () {
                //point(this.position.x, this.position.y);
                
                p5.ellipse(this.position.x, this.position.y, 4, 4);
            };
        }
                // p5.mousePressed = (event)=>gestureStart(p5, event);
                // p5.mouseDragged = (event)=>gestureDrag(p5, event);
                // p5.mouseReleased = (event)=>gestureFinish(p5, event);
                // p5.touchStarted = (event)=>gestureStart(p5, event);
                // p5.touchMoved = (event)=>gestureDrag(p5, event);
                // p5.touchEnded = (event)=>gestureFinish(p5, event);
        };
</script>
<P5 {sketch} class="test" />

