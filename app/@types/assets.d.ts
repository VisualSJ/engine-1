declare interface IdragAsset {
    /**
     * 拖动 start 的起始赋值
     * 赋值资源各自的类型
     * 外部拖进来的文件 type = 'osFile'
     * 外部节点的情况包括节点可能的所有类型，
     * 是否接受该类型需要在 drop 中明确判断
     */
    type: string; 
    from?: string; // 被拖动的节点 uuid
    to: string; // 被指向的节点 uuid
    insert: string; // 插入方式，有三种：inside, before, after
    copy: boolean; // 是否是拖动复制
    files?: string[]; // 拖拽中带上外部系统文件
}

declare interface IaddAsset {
    uuid: string; // 在该资源上发起的新增, 可能等于或不等于 parentUuid
    type: string; // 类型 folder, js, ts, png 等
    ext: string; // 新文件的后缀，.js, .ts 等
    name: string; // 文件名称 带后缀
    content?: string; // 文件的内容
    parentDir?: string; // 所在的目录的 url
    parentUuid?: string; // 所在的目录的 uuid
}

declare interface ItreeAsset {
    name: string; // 文件名，包含后缀
    source: string;
    file: string; // 磁盘路径
    uuid: string;
    importer: string;
    type: string;
    isDirectory: boolean;
    library: { [key: string]: string }; // object 多文件的 library 磁盘路径
    subAssets: { [key: string]: ItreeAsset };
    visible: boolean; // 是否显示
    readOnly: boolean; // 是否只读，不允许重名命，删除，拖拽，界面多一个锁图标
    redirect?: { // 一个资源指向另一个资源
        type: string; // 跳转资源的类型
        uuid: string; // 跳转资源的 uuid
    }

    // 以下是扩展的数据
    fileName: string; // 文件名，不包含后缀
    fileExt: string; // 后缀，不包含点好
    parentSource: string; // 父级的 source
    parentUuid: string; // 父级的 uuid
    isExpand: boolean; // 是否展开显示
    isParent: boolean; // 是否是父节点
    isRoot: boolean; // 是否是根节点，assets 这些
    isSubAsset: boolean; // 是否是 subAsset, 是的话：无右击菜单，可拖动到 scene 或 hierarchy, 但 asset 面板里面的不能移动
    state: string; // 状态: ['', 'input', 'loading']
    depth: number; // 树形层级
    top: number; // top 位置
    left: number; // 缩进的大小
    _height: number; // 整个节点包括children的高度
    height: number; // 整个节点包括children的高度
    children: ItreeAsset[];

}
