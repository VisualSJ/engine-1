const CameraControllerBase = require('./camera-controller-base');
const nodeUtils = require('../../../utils/node');
const operationManager = require('../operation');
const nodeManager = require('../node');
const utils = require('./utils');
const tween = require('./tween');
const LinearTicks = require('./grid/linear-ticks');

let exitPanModeTimer = null;
const { vec3, quat, mat4 } = cc.vmath;
const CameraMoveMode = utils.CameraMoveMode;
const _lineColor = cc.color().fromHEX('#555555');
const _lineEnd = 1000000;

class CameraController3D extends CameraControllerBase {
    constructor() {
        super();

        this.v3a = cc.v3(); // moving
        this.v3b = cc.v3(); // moving
        this.v3c = cc.v3(); // tweening
        this.v3d = cc.v3(); // tweening

        // speed controller
        this.movingSpeed = 30;
        this.movingSpeedShiftScale = 10;
        this.rotationSpeed = 0.006;
        this.panningSpeed = 0.2;
        this.wheelSpeed = 0.1;
        this.damping = 20.0;

        this.homePos = cc.v3(50, 50, 50);
        this.homeRot = quat.fromViewUp(cc.quat(), vec3.normalize(this.v3a, this.homePos));
        this._sceneViewCenter = cc.v3();
        this.defaultViewDist = 20;    // default sceneViewCenter to Camera distance;
        this.viewDist = 20;

        // temps to store directions
        this.id_right = cc.v3(1, 0, 0);
        this.id_up = cc.v3(0, 1, 0);
        this.id_forward = cc.v3(0, 0, 1);
        this.right = cc.v3(this.id_right);
        this.up = cc.v3(this.id_up);
        this.forward = cc.v3(this.id_forward);

        // temps to store velocity
        this.velocity = cc.v3();
        this.curMovSpeed = this.movingSpeed;
        this.curMouseDX = 0;
        this.curMouseDY = 0;

        // temps to store transform
        this._curRot = quat.create();
        this._curEye = cc.v3();
        this._destRot = quat.create();
        this._destEye = cc.v3();
    }

    init(camera, grid) {
        super.init(camera, grid);

        this.reset();

        this._lastPos = cc.v3();
        this._lastRot = cc.quat();

        this._initLinearTick();
    }

    _initLinearTick() {
        this.hTicks = new LinearTicks()
            .initTicks([5, 2], 1, 10000)
            .spacing(15, 80);

        this.vTicks = new LinearTicks()
        .initTicks([5, 2], 1, 10000)
        .spacing(15, 80);
    }

    set active(value) {
        if (value) {
            this._gridNode.setWorldRotationFromEuler(90, 0, 0);
            this._camera.projection = 1;
            this.node.setWorldPosition(this._lastPos);
            this.node.setWorldRotation(this._lastRot);
            this.updateGrid();
        } else {
            this.node.getWorldPosition(this._lastPos);
            this.node.getWorldRotation(this._lastRot);
            clearTimeout(exitPanModeTimer);
        }
    }

    /**
     * 还原数据
     */
    reset() {
        this.node.getWorldRotation(this._curRot);
        this._destRot = quat.clone(this._curRot);
        this.node.getWorldPosition(this._curEye);
        this._destEye = vec3.clone(this._curEye);
    }

    /**
     * 根据传入的视线长度来更新当前场景视图的中心点
     * @param {*} viewDist
     */
    updateViewCenterByDist(viewDist) {
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.forward, this.id_forward, this._curRot);
        vec3.scale(this.v3a, this.forward, viewDist);
        vec3.add(this.v3b, this._curEye, this.v3a);
        this._sceneViewCenter = this.v3b;
    }

    /**
     * 进入 Orbit 操作模式
     */
    enterOrbitMode() {
        this.camera_move_mode = CameraMoveMode.ORBIT;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        this.viewDist = vec3.distance(this._curEye, this._sceneViewCenter);
    }

    /**
     * 退出 Orbit 操作模式
     */
    exitOrbitMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 进入 Pan 操作模式
     */
    enterPanMode() {
        operationManager.requestPointerLock();
        this.camera_move_mode = CameraMoveMode.PAN;
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.right, this.id_right, this._curRot);
        vec3.transformQuat(this.up, this.id_up, this._curRot);
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 退出 Pan 操作模式
     */
    exitPanMode() {
        operationManager.exitPointerLock();
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);

        this.updateViewCenterByDist(-this.viewDist);
    }

    /**
     * 进入 Wander 操作模式
     */
    enterWanderMode() {
        this.reset();
        this.camera_move_mode = CameraMoveMode.WANDER;
        utils.$info.hidden = false;
        this.curMouseDX = 0;
        this.curMouseDY = 0;
        operationManager.requestPointerLock();
        this.emit('camera-move-mode', this.camera_move_mode);
    }

    /**
     * 退出 Wander 操作模式
     */
    exitWanderMode() {
        this.camera_move_mode = CameraMoveMode.NONE;
        this.emit('camera-move-mode', this.camera_move_mode);
        operationManager.exitPointerLock();
        utils.$info.hidden = true;

        this.updateViewCenterByDist(-this.viewDist);
    }

    /**
     * 移动画笔
     * 不同模式下响应方式不同
     * @param {*} dx
     * @param {*} dy
     */
    move(dx, dy) {
        if (this.camera_move_mode === CameraMoveMode.ORBIT) {
            let rot = this._curRot;
            quat.rotateX(rot, rot, -dy * this.rotationSpeed);
            quat.rotateAround(rot, rot, cc.v3(0, 1, 0), -dx * this.rotationSpeed);
            let offset = cc.v3(0, 0, this.viewDist);
            vec3.transformQuat(offset, offset, rot);
            vec3.add(this._curEye, this._sceneViewCenter, offset);
            this.node.setWorldPosition(this._curEye);
            this.node.setRotation(rot);
            this.updateGrid();
        } else if (this.camera_move_mode === CameraMoveMode.PAN) { // middle button: panning
            vec3.scale(this.v3a, this.right, -dx * this.panningSpeed);
            vec3.scale(this.v3b, this.up, dy * this.panningSpeed);
            vec3.add(this._curEye, this._curEye, this.v3a);
            vec3.add(this._curEye, this._curEye, this.v3b);
            this.node.setWorldPosition(this._curEye);

            // update view center
            vec3.add(this._sceneViewCenter, this._sceneViewCenter, this.v3a);
            vec3.add(this._sceneViewCenter, this._sceneViewCenter, this.v3b);
            this.updateGrid();
            return false;
        } else if (this.camera_move_mode === CameraMoveMode.WANDER) { // right button: rotation
            this.curMouseDX = dx;
            this.curMouseDY = dy;
            return false;
        }
    }

    /**
     * 缩放
     * @param {*} delta
     */
    scale(delta) {
        this.node.getWorldPosition(this._curEye);
        this.node.getWorldRotation(this._curRot);
        vec3.transformQuat(this.forward, this.id_forward, this._curRot);
        vec3.scale(this.v3a, this.forward, delta * this.wheelSpeed);
        vec3.add(this._curEye, this._curEye, this.v3a);
        this.node.setWorldPosition(this._curEye);

        this.viewDist = vec3.distance(this._curEye, this._sceneViewCenter);
        this.updateGrid();
    }

    /**
     * 焦点转向某个节点
     * 如果传入 nodes，责转向这些节点
     * 如果未传入 nodes，责转向场景中心
     * @param {*} nodes
     */
    focus(nodes) {
        if (nodes) {
            if (nodes.length <= 0) { return; }
            nodes = nodes.map((id) => nodeManager.query(id));
            let worldPos = nodeUtils.getCenterWorldPos3D(nodes);
            let minRange = nodeUtils.getMinRangeOfNodes(nodes) * 4;

            this._sceneViewCenter = worldPos;

            this.node.getRotation(this._curRot);
            vec3.transformQuat(this.forward, this.id_forward, this._curRot);
            vec3.scale(this.v3c, this.forward, minRange);
            vec3.add(this.v3d, worldPos, this.v3c);

            const startPosition = this.node.getPosition();
            tween.position(startPosition, this.v3d, 300).step((position) => {
                this.node.setPosition(position);
                this.updateGrid();
            });
            return;
        }
        // set view dist
        this._sceneViewCenter = cc.v3();
        this.viewDist = vec3.distance(this.homePos, this._sceneViewCenter);

        const startPosition = this.node.getPosition();
        const startRotation = this.node.getRotation();
        tween.position(startPosition, this.homePos, 300).step((position) => {
            this.node.setPosition(position);
            this.updateGrid();
        });
        tween.rotation(startRotation, this.homeRot, 300).step((rotation) => {
            this.node.setRotation(rotation);
            this.updateGrid();
        });
    }

    copyCameraDataToNodes(nodes) {
        if (nodes && nodes.length > 0) {
            nodes = nodes.map((id) => nodeManager.query(id));
            let baseNode = nodes[0];
            let oldBaseWorldMatrixInv = baseNode.getWorldRT();
            mat4.invert(oldBaseWorldMatrixInv, oldBaseWorldMatrixInv);
            let oldBaseRotInv = baseNode.getWorldRotation();
            quat.invert(oldBaseRotInv, oldBaseRotInv);

            let cameraPos = this.node.getWorldPosition();
            let cameraRot = this.node.getWorldRotation();
            let newBaseMatrix = this.node.getWorldRT();

            Manager.History.snapshot();

            baseNode.setWorldPosition(cameraPos);
            baseNode.setWorldRotation(cameraRot);
            this.broadcastNodeChanged(baseNode);

            if (nodes.length > 1) {
                for (let i = 1; i < nodes.length; i++) {
                    let node = nodes[i];
                    let pos = node.getWorldPosition();
                    let rot = node.getWorldRotation();

                    vec3.transformMat4(pos, pos, oldBaseWorldMatrixInv);
                    quat.mul(rot, oldBaseRotInv, rot);

                    vec3.transformMat4(pos, pos, newBaseMatrix);
                    node.setWorldPosition(pos);
                    quat.mul(rot, cameraRot, rot);
                    node.setWorldRotation(rot);
                    this.broadcastNodeChanged(node);
                }
            }
        }
    }

    broadcastNodeChanged(node) {
        Manager.Node.emit('change', node);
        Manager.Ipc.send('broadcast', 'scene:change-node', node.uuid);
    }

    onMouseDown(event) {
        if (this.camera_move_mode !== CameraMoveMode.NONE) {
            return;
        }

        if (event.leftButton && event.altKey) {
            // 鼠标左键 + CtrlOrCommand
            this.enterOrbitMode();
            return false;
        } else if (event.middleButton) {
            // 鼠标中间键
            this.enterPanMode();
            return false;
        } else if (event.rightButton) {
            // 鼠标右键
            this.enterWanderMode();
            return false;
        }
    }

    onMouseMove(event) {
        if (this.camera_move_mode === CameraMoveMode.NONE) {
            return;
        }
        this.move(event.moveDeltaX, event.moveDeltaY);
        return true;
    }

    onMouseUp(event) {
        if (this.camera_move_mode === CameraMoveMode.NONE) {
            return;
        }
        if (event.leftButton) {
            if (this.camera_move_mode === CameraMoveMode.ORBIT) {
                this.exitOrbitMode();
                return false;
            }
        } else if (event.middleButton) { // middle button: panning
            this.exitPanMode();
            operationManager.exitPointerLock();
        } else if (event.rightButton) { // right button: wander
            this.exitWanderMode();
        }
    }

    onMouseWheel(event) {
        if (Math.max(Math.abs(event.wheelDeltaX), Math.abs(event.wheelDeltaY)) > 60) {
            this.scale(-event.wheelDeltaY / 6);
        } else {
            // 双指操作触摸板，并移动的时候，触发这里，需要先进入 PAN 模式，才能移动
            if (this.camera_move_mode !== CameraMoveMode.PAN) {
                this.enterPanMode();
            }
            this.move(event.wheelDeltaX, event.wheelDeltaY);
            // for touch control
            clearTimeout(exitPanModeTimer);
            exitPanModeTimer = setTimeout(() => {
                this.exitPanMode();
            }, 100);
        }
    }

    onKeyDown(event) {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': this.velocity.x = this.curMovSpeed; break;
            case 'a': this.velocity.x = -this.curMovSpeed; break;
            case 'e': this.velocity.y = this.curMovSpeed; break;
            case 'q': this.velocity.y = -this.curMovSpeed; break;
            case 's': this.velocity.z = this.curMovSpeed; break;
            case 'w': this.velocity.z = -this.curMovSpeed; break;
        }
    }

    onKeyUp(event) {
        this.shiftKey = event.shiftKey;
        this.altKey = event.altKey;
        switch (event.key.toLowerCase()) {
            case 'd': if (this.velocity.x > 0) { this.velocity.x = 0; } break;
            case 'a': if (this.velocity.x < 0) { this.velocity.x = 0; } break;
            case 'e': if (this.velocity.y > 0) { this.velocity.y = 0; } break;
            case 'q': if (this.velocity.y < 0) { this.velocity.y = 0; } break;
            case 's': if (this.velocity.z > 0) { this.velocity.z = 0; } break;
            case 'w': if (this.velocity.z < 0) { this.velocity.z = 0; } break;
            case 'h': this.focus(); break;
        }
    }

    onUpdate() {
        if (this.camera_move_mode !== CameraMoveMode.WANDER) {
            return;
        }

        let eye = this._destEye;
        let rot = this._destRot;
        let dt =  cc.director.getDeltaTime();

        quat.rotateX(rot, rot, -this.curMouseDY * this.rotationSpeed);
        quat.rotateAround(rot, rot, cc.v3(0, 1, 0), -this.curMouseDX * this.rotationSpeed);
        quat.slerp(this._curRot, this._curRot, rot, dt * this.damping);
        vec3.scale(this.v3b, this.velocity, this.shiftKey ?
            this.movingSpeedShiftScale * dt : dt);
        vec3.transformQuat(this.v3b, this.v3b, this._curRot);
        vec3.add(eye, eye, this.v3b);
        vec3.lerp(this._curEye, this._curEye, eye, dt * this.damping);
        this.node.setPosition(this._curEye);
        this.node.setRotation(this._curRot);
        this.curMouseDX = 0;
        this.curMouseDY = 0;
        this.updateGrid();
    }

    _updateGridData(positions, colors, lineColor, lineEnd) {
        let hTicks = this.hTicks;
        let vTicks = this.vTicks;

        let cameraPos = cc.v3();
        this.node.getPosition(cameraPos);
        let distance = cameraPos.y; //用camera的高度来调整比例尺
        let scale = distance / 500;

        let range = 5000;
        let scaleRange = (range * scale) | 0;

        // 根据camera的位置来调整刻度线
        let curStartX = -scaleRange + cameraPos.x;
        let curEndX = scaleRange + cameraPos.x;
        let curStartY = -scaleRange + cameraPos.z;
        let curEndY = scaleRange + cameraPos.z;
        hTicks.range(curStartX, curEndX, range);
        vTicks.range(curStartY, curEndY, range);

        let tempColor = lineColor.clone();
        tempColor.a = 0;

        // 用一个比较小的透明度来画线，否则线非常长的时候看远处的线锯齿感非常严重
        let lineOpacity = 200;
        // 填充顶点数据
        for (let i = hTicks.minTickLevel; i <= hTicks.maxTickLevel; ++i) {
            let ratio = hTicks.tickRatios[i];
            if (ratio > 0) {

                let ticks = hTicks.ticksAtLevel(i, true);
                for (let j = 0; j < ticks.length; ++j) {
                    let tick = ticks[j];

                    let color = lineColor.clone();
                    // 根据 ratio 再计算一下当前透明度
                    color.a = ratio * lineOpacity;
                    // 越远的线越淡
                    let dist = Math.abs(tick - cameraPos.x);
                    color.a *= (1 - dist / scaleRange);
                    // x
                    positions.push(tick, cameraPos.z);
                    positions.push(tick, curStartY);
                    positions.push(tick, cameraPos.z);
                    positions.push(tick, curEndY);
                    colors.push(color.x, color.y, color.z, color.w);
                    colors.push(tempColor.x, tempColor.y, tempColor.z, tempColor.w);
                    colors.push(color.x, color.y, color.z, color.w);
                    colors.push(tempColor.x, tempColor.y, tempColor.z, tempColor.w);
                }
            }
        }

        for (let i = vTicks.minTickLevel; i <= vTicks.maxTickLevel; ++i) {
            let ratio = vTicks.tickRatios[i];
            if (ratio > 0) {
                let ticks = vTicks.ticksAtLevel(i, true);
                for (let j = 0; j < ticks.length; ++j) {
                    let tick = ticks[j];

                    let color = lineColor.clone();
                    // 根据 ratio 再计算一下当前透明度
                    color.a = ratio * lineOpacity;
                    // 越远的线越淡
                    let dist = Math.abs(tick - cameraPos.z);
                    color.a *= (1 - dist / scaleRange);
                    // y
                    positions.push(cameraPos.x, tick);
                    positions.push(curStartX, tick);
                    positions.push(cameraPos.x, tick);
                    positions.push(curEndX, tick);
                    colors.push(color.x, color.y, color.z, color.w);
                    colors.push(tempColor.x, tempColor.y, tempColor.z, tempColor.w);
                    colors.push(color.x, color.y, color.z, color.w);
                    colors.push(tempColor.x, tempColor.y, tempColor.z, tempColor.w);
                }
            }
        }
    }

    updateGrid() {
        let positions = [];
        let colors = [];
        let indices = [];

        this._updateGridData(positions, colors, _lineColor, _lineEnd);

        for (let i = 0; i < positions.length; i += 2) {
            indices.push(i / 2);
        }

        utils.updateVBAttr(this._gridMeshComp, cc.GFXAttributeName.ATTR_POSITION, positions);
        utils.updateVBAttr(this._gridMeshComp, cc.GFXAttributeName.ATTR_COLOR, colors);
        utils.updateIB(this._gridMeshComp, indices);
    }
}

module.exports = CameraController3D;
