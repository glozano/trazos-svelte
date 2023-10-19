import {INVISIBLE_ALPHA} from '$lib/andiamo/parameters';

class StrokeQuad { 
  
  constructor(p5, t) { 
    this.p5 = p5;
    this.t = t;
    this.x = [0, 0, 0, 0];
    this.y = [0, 0, 0, 0];
    this.u = [0, 0, 0, 0];
    this.v = [0, 0, 0, 0];
    this.r = [0, 0, 0, 0];
    this.g = [0, 0, 0, 0];
    this.b = [0, 0, 0, 0];
    this.a = [0, 0, 0, 0];
    this.a0 = [0, 0, 0, 0];
    this.visible = true;
  }

  setVertex = function(i, x, y, u, v, r, g, b, a) {
    this.x[i] = x;
    this.y[i] = y;

    this.u[i] = u;
    this.v[i] = v;

    this.r[i] = r;
    this.g[i] = g;
    this.b[i] = b;
    this.a[i] = a;

    this.a0[i] = a;
  }

  restoreAlpha = function () {
    for (var i = 0; i < 4; i++) {
      this.a[i] = this.a0[i];
    }
  }

  update = function(ff, all) {
    this.visible = false;
    for (var i = 0; i < 4; i++) {
      this.a[i] *= ff;
      if (INVISIBLE_ALPHA < this.a[i]) {
        this.visible = true;
      } else {
        this.a[i] = 0;
      }
    }
  }

  /*
  // separate quads 
  draw = function(ascale) {
    if (this.visible) {
      beginShape(QUADS);
      for (var i = 0; i < 4; i++) {
        noStroke();
        fill(this.r[i], this.g[i], this.b[i], this.a[i] * ascale);
        vertex(this.x[i], this.y[i]);
      }
      endShape(CLOSE);
    }
  }
  */

  // quad strip
  draw = function(ascale) {
    if (this.visible) {
      for (var i = 2; i < 4; i++) {
        this.p5.fill(this.r[i], this.g[i], this.b[i], this.a[i] * ascale);
        this.p5.vertex(this.x[i], this.y[i]);
      }
    }
  }
}

function generateRandomString(length) {
  // Define all the possible characters you want in your string
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  for (var i = 0; i < length; i++) {
    // Get a random character from the possible characters string
    var randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }
  return result;
}

class StrokeGesture { 
  constructor(p5, dissapearing, fixed, prev, layer, loopMultiplier ) {
    this.p5 = p5;
    this.loopMultiplier = loopMultiplier;
    this.prev = prev;
    this.next = null;
    this.quads = [];
    this.ctx = p5.drawingContext;
    this.t0 = 0;
    this.t1 = 0;
    this.lastUpdate = 0;
    // this.gestureId = generateRandomString(10);

    this.looping = false;
    this.fadeOutFact = 1;
    this.fadeOutFact0 = 1;
    this.alphaScale = 1;

    this.starting = true;
    this.visible = true;
    this.loopTime = -1;
    this.qcount = 0;

    this.dissapearing = dissapearing;
    this.fixed = fixed;

    this.layer = layer;
  }

  setStartTime = function(t0) {
    this.t0 = t0;
    this.t1 = t0;
    this.lastUpdate = t0;
  }

  getStartTime = function() {
    return this.t0;
  }

  clear = function() {
    this.quads = [];
  }

  isStarting = function() {
    if (this.starting) {
      this.starting = false;
      return true;
    } else {
      return false;
    }
  }

  getAlphaScale = function() {
    return this.alphaScale;
  }

  setAlphaScale = function(s) {
    this.alphaScale = s;
  }

  isVisible = function() {
    return this.visible;
  }

  isLooping = function() {
    return this.looping;
  }

  setLooping = function(loop) {
    this.looping = loop;
  }

  setEndTime = function(t1) {
    this.t1 = t1;
    if (this.fixed) {
      this.fadeOutFact = 1;
    } else {
      var millisPerFrame =  1000.0 / this.p5.frameRate();
      var dt = this.t1 - this.t0;
      var nframes = Math.floor(this.loopMultiplier * dt / millisPerFrame);
      this.fadeOutFact = Math.exp(Math.log(INVISIBLE_ALPHA / 255.0) / nframes);
      this.fadeOutFact0 = this.fadeOutFact;
    }
    return this;
  }

  addQuad = function(quad) {
    this.quads.push(quad);
  }

  update = function(t) {
    this.visible = false;
    this.qcount = 0;
    for (var i = 0; i < this.quads.length; i++) {
      var quad = this.quads[i]
      if (this.loopTime == -1 || quad.t - this.t0 <= this.loopTime) {
        quad.update(this.fadeOutFact, this.qcount >= this.quads.length);
        this.qcount++;
        if (quad.visible) {
          this.visible = true;
        }
      }
    }

    if (this.looping) {
      if (-1 < this.loopTime) {
        this.loopTime += t - this.lastUpdate;
      }
      if (this.isDrawn()) {
        // start/restart loop.
        if (!this.dissapearing) this.fadeOutFact = 1;
        for (var i = 0; i < this.quads.length; i++) {
          var quad = this.quads[i]
          quad.restoreAlpha();
        }
        this.loopTime = 0;
      }
      if (this.t1 - this.t0 < this.loopTime) {
        this.fadeOutFact = this.fadeOutFact0;
      }
    }

    this.lastUpdate = t;
  }

  isDrawn = function() {
    return 0 < this.qcount && !this.visible && (!this.next || this.next.isDrawn());
  }

  /*
  // Separate quads
  draw = function() {
    if (this.visible) {
      // if (USE_TEXTURES) {
      //   pg.texture(textures.get(tex));
      // }
      for (var i = 0; i < this.quads.length; i++) {
        var quad = this.quads[i]
        if (this.loopTime == -1 || quad.t - this.t0 <= this.loopTime) {
          quad.draw(this.alphaScale);
        }
      }
    }
  }
  */

  /*
  // quad strip
  draw = function() {
    if (this.visible && 0 < this.quads.length) {
      beginShape(QUAD_STRIP);    
      noStroke();
      for (var i = 0; i < this.quads.length; i++) {
        var quad = this.quads[i]
        if (this.loopTime == -1 || quad.t - this.t0 <= this.loopTime) {
          quad.draw(this.alphaScale);
        }
      }
      endShape();
    }
  }
  */

  draw = function() {
    if (this.visible && 0 < this.quads.length) {
      var ascale = this.alphaScale;
      var i = 0;
      var inc = 1;
      this.ctx.beginPath();
      var quad0 = this.quads[0];
      var c0 = this.p5.color(quad0.r[0], quad0.g[0], quad0.b[0], quad0.a[0] * ascale);
      this.ctx.fillStyle = c0.toString();
      this.ctx.moveTo(quad0.x[0], quad0.y[0]);
      while (true) {
        i += inc;
        var quad = this.quads[i];
        if (0 < inc) {
          var c2 = this.p5.color(quad.r[2], quad.g[2], quad.b[2], quad.a[2] * ascale);
          this.ctx.fillStyle = c2.toString();
          this.ctx.lineTo(quad.x[2], quad.y[2]);
        }
        if ((i == this.quads.length - 1) ||
            !(this.loopTime == -1 || quad.t - this.t0 <= this.loopTime)) {
          inc = -1;
        }
        if (inc < 0) {
          var c3 = this.p5.color(quad.r[3], quad.g[3], quad.b[3], quad.a[3] * ascale);
          this.ctx.fillStyle = c3.toString();
          this.ctx.lineTo(quad.x[3], quad.y[3]);
        }
        if (i == 0) {
          break;
        }
      } 
      this.ctx.closePath();
      this.ctx.fill();
    }
  }
}

export { StrokeQuad, StrokeGesture };