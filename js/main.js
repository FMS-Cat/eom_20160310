( function() {

  'use strict';

  let requestText = function( _url, _callback ){
    let xhr = new XMLHttpRequest();
    xhr.open( 'GET', _url, true );
    xhr.responseType = 'text';
    xhr.onload = function( _e ){
      if( typeof _callback === 'function' ){
        _callback( this.response );
      }
    };
    xhr.send();
  };

  let step = function( _array ){
    let array = _array;
    let count = 0;

    let func = function(){
      if( typeof _array[ count ] === 'function' ){
        _array[ count ]( func );
      }
      count ++;
    };
    func();
  };

  // ------

  let seed;
  let xorshift = function( _seed ) {
    seed = _seed || seed || 1;
    seed = seed ^ ( seed << 13 );
    seed = seed ^ ( seed >>> 17 );
    seed = seed ^ ( seed << 5 );
    return seed / Math.pow( 2, 32 ) + 0.5;
  };

  // ------

  let clamp = function( _value, _min, _max ) {
    return Math.min( Math.max( _value, _min ), _max );
  }

  let saturate = function( _value ) {
    return clamp( _value, 0.0, 1.0 );
  }

  let merge = function( _a, _b ) {
    let ret = {};
    for ( let key in _a ) {
      ret[ key ] = _a[ key ];
    }
    for ( let key in _b ) {
      ret[ key ] = _b[ key ];
    }
    return ret;
  }

  // ------

  let gl = canvas.getContext( 'webgl' );
  let glCat = new GLCat( gl );

  let programs = {};
  let quadVBO = glCat.createVertexbuffer( [ -1, -1, 1, -1, -1, 1, 1, 1 ] );
  let quadVert = 'attribute vec2 p; void main() { gl_Position = vec4( p, 0.0, 1.0 ); }';

  let framebuffers = {};
  framebuffers.render = glCat.createFloatFramebuffer( canvas.width, canvas.height );
  framebuffers.blur = glCat.createFloatFramebuffer( canvas.width, canvas.height );
  framebuffers.return = glCat.createFloatFramebuffer( canvas.width, canvas.height );

  let renderA = document.createElement( 'a' );

  // ------

  let movementInit = {
    mode: Movement.SPRING,
    springConstant: 70.0,
    springRatio: 1.0,
    frameRate: 50.0
  };
  let movementInitCamera = merge(
    movementInit,
    { springConstant: 30.0 }
  );
  let movements = {};

  movements.cameraX = new Movement( movementInitCamera );
  movements.cameraY = new Movement( movementInitCamera );
  movements.cameraZ = new Movement( movementInitCamera );
  movements.sceneRotate = new Movement( movementInit );
  movements.ifsRotateX = new Movement( movementInit );
  movements.ifsRotateY = new Movement( movementInit );
  movements.ifsRotateZ = new Movement( movementInit );
  movements.ifsShiftX = new Movement( movementInit );
  movements.ifsShiftY = new Movement( movementInit );
  movements.ifsShiftZ = new Movement( movementInit );
  movements.ifsIter = new Movement( movementInit );
  movements.initBox = new Movement( movementInit );
  window.movements = movements;

  // ------

  let time = 0;
  let frame = 0;
  let blurCount = 0;

  let timeline = {
    0.00: function() {
      movements.sceneRotate.set( { target: 1.0 } );
      movements.ifsRotateX.set( { target: 0.30 } );
      movements.ifsRotateY.set( { target: 0.34 } );
      movements.ifsRotateZ.set( { target: 0.24 } );
      movements.ifsShiftX.set( { target: 7.4 * 1.4 } );
      movements.ifsShiftY.set( { target: 8.9 * 1.4 } );
      movements.ifsShiftZ.set( { target: 8.9 * 1.4 } );

      movements.cameraX.set( { target: 3.0, position: -movements.cameraX.position } );
      movements.cameraY.set( { target: 0.0 } );
      movements.cameraZ.set( { target: 0.0, position: -movements.cameraZ.position } );

    },
    0.20: function() {
      movements.cameraX.set( { target: 0.5 } );
      movements.cameraY.set( { target: -0.2 } );
      movements.cameraZ.set( { target: 1.0 } );

      movements.ifsRotateY.set( { target: 0.6 } );
    },
    0.29: function() {
      movements.sceneRotate.set( { target: 0.0, position: 0.0, velocity: 0.0 } );

      movements.ifsRotateX.set( { target: 0.2, position: 0.2, velocity: 0.0 } );
      movements.ifsRotateY.set( { target: 0.4, position: 0.4, velocity: 0.0 } );
      movements.ifsRotateZ.set( { target: 0.1, position: 0.1, velocity: 0.0 } );
      movements.ifsShiftX.set( { target: 1.6, position: 1.6, velocity: 0.0 } );
      movements.ifsShiftY.set( { target: 1.6, position: 1.6, velocity: 0.0 } );
      movements.ifsShiftZ.set( { target: 1.1, position: 1.1, velocity: 0.0 } );

      movements.ifsIter.set( { target: 0.0, position: 0.0, velocity: 0.0 } );
      movements.initBox.set( { target: 0.0, position: 0.0, velocity: 0.0 } );
    },
    0.30: function() {
      movements.ifsIter.set( { target: 1.0 } );
    },
    0.38: function() {
      movements.ifsIter.set( { target: 2.0 } );
    },
    0.46: function() {
      movements.ifsIter.set( { target: 3.0 } );
    },
    0.54: function() {
      movements.ifsIter.set( { target: 4.0 } );
    },
    0.62: function() {
      movements.ifsIter.set( { target: 5.0 } );
    },
    0.77: function() {
      movements.cameraX.set( { target: -0.5 } );
      movements.cameraY.set( { target: 0.5 } );
      movements.cameraZ.set( { target: 1.0 } );
    },
    0.80: function() {
      movements.initBox.set( { target: 1.0 } );

      movements.ifsRotateX.set( { target: 0.15 } );
      movements.ifsRotateY.set( { target: 0.32 } );
      movements.ifsRotateZ.set( { target: 0.11 } );
      movements.ifsShiftX.set( { target: 7.4 } );
      movements.ifsShiftY.set( { target: 5.4 } );
      movements.ifsShiftZ.set( { target: 7.1 } );
    }
  };

  let timelineProgress = -1.0;
  let executeTimeline = function() {
    for ( let keyTime in timeline ) {
      if ( keyTime < time ) {
        if ( timelineProgress < keyTime ) {
          timelineProgress = keyTime;
          timeline[ keyTime ]();
          break;
        }
      } else {
        break;
      }
    }
  }

  let movement = function() {

    executeTimeline();

    for ( let key in movements ) {
      movements[ key ].frameRate = 50.0 * ( blurCheckbox.checked ? 10.0 : 1.0 );
      movements[ key ].update();
    }

  }

  let raymarch = function() {

    glCat.useProgram( programs.raymarch );
    gl.bindFramebuffer( gl.FRAMEBUFFER, blurCheckbox.checked ? framebuffers.render : null );
    glCat.clear();

    glCat.attribute( 'p', quadVBO, 2 );

    glCat.uniform1f( 'time', time );
    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );

    glCat.uniform3fv( 'u_cameraPos', [
      movements.cameraX.position,
      movements.cameraY.position,
      movements.cameraZ.position
    ] );
    glCat.uniform1f( 'u_sceneRotate', movements.sceneRotate.position );
    glCat.uniform3fv( 'u_ifsRotate', [
      movements.ifsRotateX.position,
      movements.ifsRotateY.position,
      movements.ifsRotateZ.position
    ] );
    glCat.uniform3fv( 'u_ifsShift', [
      movements.ifsShiftX.position,
      movements.ifsShiftY.position,
      movements.ifsShiftZ.position
    ] );
    glCat.uniform1f( 'u_ifsIter', movements.ifsIter.position );
    glCat.uniform1f( 'u_initBox', movements.initBox.position );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    gl.flush();

  };

  let blur = function() {

    glCat.useProgram( programs.blur );
    gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffers.return );
    glCat.clear();

    glCat.uniform1f( 'add', 0.1 );
    glCat.uniform1i( 'init', blurCount === 0 );
    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );

    glCat.uniformTexture( 'renderTexture', framebuffers.render.texture, 0 );
    glCat.uniformTexture( 'blurTexture', framebuffers.blur.texture, 1 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    glCat.useProgram( programs.return );
    gl.bindFramebuffer( gl.FRAMEBUFFER, blurCount === 9 ? null : framebuffers.blur );
    glCat.clear();

    glCat.uniform2fv( 'resolution', [ canvas.width, canvas.height ] );

    glCat.uniformTexture( 'texture', framebuffers.return.texture, 0 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    gl.flush();

  }

  let render = function() {
    if ( blurCheckbox.checked ) {
      for ( let iBlur = 0; iBlur < 10; iBlur ++ ) {
        blurCount = iBlur;
        movement();
        raymarch();
        blur();
      }
    } else {
      movement();
      raymarch();
    }
  }

  let saveFrame = function() {
    renderA.href = canvas.toDataURL();
    renderA.download = ( '0000' + frame ).slice( -5 ) + '.png';
    renderA.click();
  };

  let update = function() {

    let frames = 160;
    if ( ( frame % frames ) === 0 ) {
      timelineProgress = -1.0;
    }
    time = ( frame % frames ) / frames;

    render();

    if ( saveCheckbox.checked && frames <= frame ) {
      saveFrame();
    }

    frame ++;
    requestAnimationFrame( update );

  };

  goButton.onclick = function() {
    update();
  };

  // ------

  step( {
    0: function( _step ) {
      requestText( '../shader/raymarch.frag', function( _frag ) {
        programs.raymarch = glCat.createProgram( quadVert, _frag );
        _step();
      } );
      requestText( '../shader/blur.frag', function( _frag ) {
        programs.blur = glCat.createProgram( quadVert, _frag );
        _step();
      } );
      requestText( '../shader/return.frag', function( _frag ) {
        programs.return = glCat.createProgram( quadVert, _frag );
        _step();
      } );
    },
    3: function( _step ) {
      goButton.style.display = 'inline';
    }
  } );



} )();
