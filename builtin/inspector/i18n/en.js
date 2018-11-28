'use strict';
const { readFileSync } = require('fs');
const { join } = require('path');

const resources_tips = readFileSync(join(__dirname, '../static/markdown/resources-tips-en.md'), { encoding: 'utf-8' });

module.exports = {
    title: 'inspector',
    add_component: 'Add Component',
    add_ui_component: 'Add UI Component',
    move_down: 'Move Down',
    move_up: 'Move Up',
    remove: 'Remove',
    reset: 'Reset',
    reset_node: 'Reset Node',
    reset_all: 'Reset All',
    select_button: 'Select In Atlas',
    edit_button: 'Edit',
    resize_to_target: 'Resize To Target',
    difference: 'Difference',
    javascript: {
        plugin: 'Import As Plugin',
        loadPluginInWeb: 'Load In Web',
        loadPluginInEditor: 'Load In Editor',
        loadPluginInNative: 'Load In Native',
    },
    block_input_events: {
        brief_help: `This component will block all input events,
            preventing the input from penetrating into the underlying node,
            typically for the background of the top UI.`,
    },
    node: {
        title: 'Node Presets',
        create_empty: 'Create Empty Node',
        renderers: 'Create Renderer Nodes',
        ui: 'Create UI Nodes',
        sprite: 'Sprite Node',
        sprite_splash: 'Sprite Node (Splash)',
        particle: 'ParticleSystem Node',
        tiledmap: 'TiledMap Node',
        tiledtile: 'TiledTile Node',
        mask: 'Mask Node',
        label: 'Node With Label',
        scrollview: 'Node With ScrollView',
        pageview: 'Node With PageView',
        slider: 'Node With Slider',
        button: 'Node With Button',
        canvas: 'Node With Canvas',
        layout: 'Node With Layout',
        progressbar: 'Node With ProgressBar',
        editbox: 'Node With EditBox',
        videoplayer: 'Node with VideoPlayer',
        break_prefab_instance: 'Convert to Ordinary Node',
        link_prefab: 'Connect Node To Prefab',
        webview: 'Node with WebView',
        richtext: 'Node with RichText',
        toggle: 'Node with Toggle',
        toggleContainer: 'Node with ToggleContainer',
        toggleGroup: 'Node with ToggleGroup (Legacy)',
    },
    component: {
        title: 'Component',
        renderers: 'Add Renderer Component',
        ui: 'Add UI Component',
        others: 'Add Other Component',
        scripts: 'Add Custom Component',
        collider: 'Add Collider Component',
        physics: 'Add Physics Component',
        // 3d
        components: 'Components',
    },
    collider: {
        editing: 'Edit this collider component',
        category: 'Collider component category',
        mask: 'The collider mask can collide with this collider',
        regenerate_points: 'Regenerate Points',
    },
    particle_system: {
        preview: 'Play particle in edit mode',
        custom: 'If set custom to true, then use custom properties insteadof read particle file',
        file: 'The plist file',
        spriteFrame: 'SpriteFrame of Particle System',
        texture: 'Texture of Particle System, readonly, please use spriteFrame to setup new texture',
        particleCount: 'Current quantity of particles that are being simulated',
        srcBlendFactor: 'Specify the source Blend Factor',
        dstBlendFactor: 'Specify the destination Blend Factor',
        playOnLoad: 'If set to true, the particle system will automatically start playing on onLoad',
        autoRemoveOnFinish: 'Indicate whether the owner node will be auto-removed when it has no particles left',
        duration: 'How many seconds the emitter wil run. -1 means forever',
        emissionRate: 'Emission rate of the particles',
        life: 'Life and variation of each particle setter',
        totalParticles: 'Maximum particles of the system',
        startColor: 'Start color of each particle',
        startColorVar: 'Variation of the start color',
        endColor: 'Ending color of each particle',
        endColorVar: 'Variation of the end color',
        angle: 'Angle and variation of each particle setter',
        startSize: 'Start size and variation in pixels of each particle',
        endSize: 'End size and variation in pixels of each particle',
        startSpin: 'Start angle and variation of each particle',
        endSpin: 'End angle and variation of each particle',
        sourcePos: 'Source position of the emitter',
        posVar: 'Variation of source position',
        positionType: 'Particles movement type',
        emitterMode: 'Particles emitter modes',
        gravity: 'Gravity of the emitter',
        speed: 'Speed and variation of the emitter',
        tangentialAccel: 'Tangential acceleration and variation of each particle. Only available in Gravity mode ',
        radialAccel: 'Acceleration and variation of each particle. Only available in Gravity mode',
        rotationIsDir:
            'Indicate whether the rotation of each particle equals to its direction. Only available in Gravity mode',
        startRadius: 'Starting radius and variation of the particles. Only available in Radius mode',
        endRadius: 'Ending radius and variation of the particles. Only available in Radius mode',
        rotatePerS: `Number of degress to rotate a particle around the source pos per second and variation.
            Only available in Radius mode`,
    },
    particle: {
        export_title: 'Export custom particle data to plist file.',
        export: 'Export',
        export_error: 'This resource does not support exports outside of the project',
        sync: 'Sync',
        sync_tips: 'Synchronize the parameters in the File to Custom',
    },
    physics: {
        rigid_body_last: 'Last',
        rigid_body_next: 'Next',
        rigidbody: {
            enabledContactListener: `Should enabled contact listener. When a collision is trigger,
                the collision callback will only be called when enabled contact listener.`,
            bullet: 'Is this a fast moving body that should be prevented from tunneling through other moving bodies?',
            type: 'Rigidbody type : Static, Kinematic, Dynamic or Animated.',
            allowSleep:
                'Set this flag to false if this body should never fall asleep. Note that this increases CPU usage.',
            gravityScale: 'Scale the gravity applied to this body.',
            linearDamping: `Linear damping is use to reduce the linear velocity.
                The damping parameter can be larger than 1,
                but the damping effect becomes sensitive to the time step when the damping parameter is large.`,
            angularDamping: `Angular damping is use to reduce the angular velocity.
                The damping parameter can be larger than 1 but the damping effect
                becomes sensitive to the time step when the damping parameter is large.`,
            linearVelocity: "The linear velocity of the body's origin in world co-ordinates",
            angularVelocity: 'The angular velocity of the body.',
            fixedRotation: 'Should this body be prevented from rotating?',
            awake: 'Is this body initially awake or sleeping?',
        },
        physics_collider: {
            density: 'The density',
            sensor: 'A sensor collider collects contact information but never generates a collision response',
            friction: 'The friction coefficient, usually in the range [0,1].',
            restitution: 'The restitution (elasticity) usually in the range [0,1].',
            anchor: 'The anchor of the rigidbody.',
            connectedAnchor: 'The anchor of the connected rigidbody.',
            connectedBody: 'The rigidbody to which the other end of the joint is attached.',
            collideConnected: 'Should the two rigid bodies connected with this joint collide with each other?',
            distance: 'The distance separating the two ends of the joint.',
            frequency: 'The spring frequency.',
            dampingRatio: 'The damping ratio.',
            linearOffset: 'The linear offset from connected rigidbody to rigidbody.',
            angularOffset: 'The angular offset from connected rigidbody to rigidbody.',
            maxForce: 'The maximum force can be applied to rigidbody.',
            maxTorque: 'The maximum torque can be applied to rigidbody.',
            correctionFactor: 'The position correction factor in the range [0,1].',
            mouseRegion: "The node used to register touch evnet. If this is null, it will be the joint's node.",
            target: 'The target point. The mouse joint will move choosed rigidbody to target point.',
            localAxisA: 'The local joint axis relative to rigidbody.',
            enableLimit: 'Enable joint distance limit?',
            enableMotor: 'Enable joint motor?',
            lowerLimit: 'The lower joint limit.',
            upperLimit: 'The upper joint limit.',
            maxMotorForce: 'The maxium force can be applied to rigidbody to rearch the target motor speed.',
            motorSpeed: 'The expected motor speed.',
            referenceAngle: 'The reference angle. An angle between bodies considered to be zero for the joint angle.',
            lowerAngle: 'The lower angle.',
            upperAngle: 'The upper angle.',
            maxMotorTorque: 'The maxium torque can be applied to rigidbody to rearch the target motor speed.',
            maxLength: 'The max length.',
            offset: 'Position offset',
            size: 'Box size',
            radius: 'Circle radius',
            tag: `Tag. If a node has several collider components,
                 you can judge which type of collider is collided according to the tag.`,
            points: 'Polygon points',
        },
    },
    SPRITE_EDITOR: {
        title: 'Sprite Editor',
        border: 'Border',
        left: 'Left',
        right: 'Right',
        top: 'Top',
        bottom: 'Bottom',
    },
    missing_script: {
        error_compiled: `Error on executing script, or the script reference is missing.
            Please check error log carefully and correct/recover your script.
            The component will be restored once scripting error is gone. If you no long need the missing script,
            please remove this component manually.`,
        error_not_compiled: `Error on compiling script. Please check error log carefully and correct your script.
            This component will be restored once compiling error is gone.`,
    },
    empty_component_message: 'The component has not properties to display',
    folder: {
        is_subpackage: 'Subpackage',
        subpackage_name: 'Subpackage Name',
    },
    assets: {
        resources_tips,
    },
};
