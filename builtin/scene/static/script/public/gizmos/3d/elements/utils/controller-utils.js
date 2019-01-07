'use strict';
let ControllerShape = require('./controller-shape');
const External = require('../../../utils/external');
const NodeUtils = External.NodeUtils;
const ControllerShapeCollider = require('./controller-shape-collider');
const { gfx, create3DNode, addMeshToNode, setMeshColor, setNodeOpacity } = require('../../../utils/engine');
const Utils = require('../../../utils');
const MathUtil = External.EditorMath;

const vec3 = cc.vmath.vec3;

let ControllerUtils = {};
ControllerUtils.YELLOW = new cc.Color(255, 255, 0);

ControllerUtils.arrow = function(headHeight, headRadius, bodyHeight, color, name) {
    if (name == null) {
        name = 'arrow';
    }

    let axisNode = create3DNode(name);

    // body
    let cylinderNode = create3DNode('ArrowBody');
    cylinderNode.parent = axisNode;
    addMeshToNode(cylinderNode,
        //ControllerShape.cylinder(bodyRadius, bodyRadius, bodyHeight, 10, 10));
        ControllerShape.lineWithBoundingBox(bodyHeight), { alpha: 200, noDepthTestForLines: true });
    setMeshColor(cylinderNode, color);
    cylinderNode.eulerAngles = cc.v3(0, 0, 90);
    let csc = cylinderNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    // head
    let coneNode = create3DNode('ArrowHead');
    coneNode.parent = axisNode;
    addMeshToNode(coneNode,
        ControllerShape.cone(headRadius, headHeight), { cullMode: gfx.CULL_BACK });
    setMeshColor(coneNode, color);
    coneNode.setPosition(cc.v3(0, bodyHeight + headHeight / 2, 0));
    csc = coneNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    return axisNode;
};

ControllerUtils.quad = function(width, height, color = cc.Color.RED, name = 'plane', opts = {}) {
    let quadNode = create3DNode(name);
    addMeshToNode(quadNode, ControllerShape.quad(width, height), opts);
    setMeshColor(quadNode, color);
    return quadNode;
};

ControllerUtils.borderPlane = function(width, height, color, opacity, name) {
    if (name == null) {
        name = 'borderPlane';
    }

    let halfWidth = width / 2;
    let halfHeight = height / 2;
    let borderPlane = create3DNode(name);
    // plane
    let planeNode = create3DNode('Plane');
    addMeshToNode(planeNode,
        ControllerShape.quad(width, height));
    setMeshColor(planeNode, color);
    setNodeOpacity(planeNode, opacity);
    planeNode.parent = borderPlane;
    let csc = planeNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    function createBorder(startPos, endPos, color) {
        let borderNode = create3DNode('border');
        addMeshToNode(borderNode,
            ControllerShape.line(startPos, endPos), { alpha: 200, noDepthTestForLines: true });
        setMeshColor(borderNode, color);
        borderNode.parent = borderPlane;
        return borderNode;
    }

    // borders
    createBorder(cc.v3(0, height / 2, 0), cc.v3(halfWidth, height / 2, 0), color);
    createBorder(cc.v3(halfWidth, halfHeight, 0), cc.v3(halfWidth, 0, 0), color);

    return borderPlane;
};

ControllerUtils.circle = function(center, normal, radius, color, name) {
    if (name == null) {
        name = 'circle';
    }

    let circleNode = create3DNode(name);
    addMeshToNode(circleNode,
        ControllerShape.circle(center, normal, radius));
    setMeshColor(circleNode, color);

    return circleNode;
};

ControllerUtils.torus = function(radius, tube, opts, color, name = 'torus') {
    let torusNode = create3DNode(name);
    addMeshToNode(torusNode,
        ControllerShape.torus(radius, tube, opts), { cullMode: gfx.CULL_BACK });
    setMeshColor(torusNode, color);
    let csc = torusNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = true;
    csc.isRender = false;

    return torusNode;
};

ControllerUtils.cube = function(width, height, depth, color, name) {
    if (name == null) {
        name = 'cube';
    }
    let cubeNode = create3DNode(name);
    addMeshToNode(cubeNode,
        ControllerShape.cube(width, height, depth), { cullMode: gfx.CULL_BACK });
    setMeshColor(cubeNode, color);
    let csc = cubeNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;
    return cubeNode;
};

ControllerUtils.scaleSlider = function(headWidth, bodyHeight, color, name) {
    if (name == null) {
        name = 'scaleSlider';
    }
    let scaleSliderNode = create3DNode(name);
    let headNode = ControllerUtils.cube(headWidth, headWidth, headWidth, color, 'ScaleSliderHead');
    headNode.parent = scaleSliderNode;
    headNode.setPosition(0, bodyHeight + headWidth / 2, 0);

    let bodyNode = create3DNode('ScaleSliderBody');
    addMeshToNode(bodyNode,
        ControllerShape.lineWithBoundingBox(bodyHeight), { noDepthTestForLines: true });
    setMeshColor(bodyNode, color);
    bodyNode.parent = scaleSliderNode;
    bodyNode.eulerAngles = cc.v3(0, 0, 90);
    let csc = bodyNode.addComponent(ControllerShapeCollider);
    csc.isDetectMesh = false;

    return scaleSliderNode;
};

ControllerUtils.getCameraDistanceFactor = function(pos, camera) {
    let cameraPos = NodeUtils.getWorldPosition3D(camera);
    let dist = cc.vmath.vec3.distance(pos, cameraPos);

    return dist;
};

ControllerUtils.lineTo = function(startPos, endPos, color = cc.Color.RED, opts) {
    let lineNode = create3DNode('line');
    addMeshToNode(lineNode,
        ControllerShape.line(startPos, endPos), opts);
    setMeshColor(lineNode, color);

    return lineNode;
};

ControllerUtils.disc = function(center, normal, radius, color = cc.Color.RED, name = 'disc') {
    let discNode = create3DNode(name);
    addMeshToNode(discNode,
        ControllerShape.disc(center, normal, radius));
    setMeshColor(discNode, color);

    return discNode;
};

ControllerUtils.sector = function(center, normal, fromDir, radian, radius, color = cc.Color.RED) {
    let sectorNode = create3DNode('sector');
    addMeshToNode(sectorNode,
        ControllerShape.sector(center, normal, fromDir, radian, radius, 60));
    setMeshColor(sectorNode, color);

    return sectorNode;
};

ControllerUtils.arc = function(center, normal, fromDir, radian, radius, color = cc.Color.RED, opts) {
    let arcNode = create3DNode('arc');
    addMeshToNode(arcNode,
        ControllerShape.arc(center, normal, fromDir, radian, radius), opts);
    setMeshColor(arcNode, color);

    return arcNode;
};

ControllerUtils.arcDirectionLine = function(center, normal, fromDir, radian,
                                            radius, length, segments, color = cc.Color.RED) {
    let arcDirNode = create3DNode('arcDirLine');
    addMeshToNode(arcDirNode,
        ControllerShape.arcDirectionLine(center, normal, fromDir, radian, radius, length, segments));
    setMeshColor(arcDirNode, color);

    return arcDirNode;
};

ControllerUtils.lines = function(vertices, indices, color = cc.Color.RED) {
    let linesNode = create3DNode('lines');
    addMeshToNode(linesNode,
        ControllerShape.lines(vertices, indices));
    setMeshColor(linesNode, color);

    return linesNode;
};

ControllerUtils.wireframeBox = function(center, size, color) {
    let boxNode = create3DNode('wireframeBox');
    addMeshToNode(boxNode,
        ControllerShape.wireframeBox(center, size));
    setMeshColor(boxNode, color);

    return boxNode;
};

ControllerUtils.frustum = function(fov, aspect, near, far, color) {
    let frustumNode = create3DNode('frustumNode');
    addMeshToNode(frustumNode,
        ControllerShape.frustum(fov, aspect, near, far));
    setMeshColor(frustumNode, color);

    return frustumNode;
};

ControllerUtils.angle = function(from, to) {
    let demominator = Math.sqrt(Utils.getSqrMagnitude(from) * Utils.getSqrMagnitude(to));
    if (demominator < MathUtil.EPSILON) {
        return 0;
    }

    let dot = MathUtil.clamp(vec3.dot(from, to) / demominator, -1, 1);
    return Math.acos(dot) * MathUtil.R2D;
};

module.exports = ControllerUtils;
