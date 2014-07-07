app.directive("spinner", function() {
    return {
        restrict: "A",
        scope: {
            ngModel: "="
        },
        link: function(scope, elem, attr) {
            elem.bind('keydown keypress', function(e) {
                if (e.which == 38) {
                    scope.$apply(function() {
                        scope.ngModel = Number(scope.ngModel) - 6;
                    });
                } else if (e.which == 40) {
                    scope.$apply(function() {
                        scope.ngModel = Number(scope.ngModel) + 6;
                    });
                }
            });
        }
    };
});

app.directive("plasmidapi",['SVGUtil', function(SVGUtil){
    return {
        restrict: "AE",
        link : function(scope, elem, attr){
            scope[attr.name] = SVGUtil.api;
        }
    };
}]);

app.directive("plasmid", ['SVGUtil', function(SVGUtil){
    return {
        restrict: 'AE',
        type : 'svg',
        template : '<svg></svg>',
        replace : true,
        transclude:true,
        require: 'plasmid',
        scope: {
            plasmidheight : '=',
            plasmidwidth : '=',
            sequencelength : '=',
            sequence : '='
        },
        link : {
            pre : function(scope,elem,attr,plasmidController){
                plasmidController.init(elem);
            },
            post : function(scope,elem,attrs,plasmidController,transcludeFn){

                // Manually transclude children elements
                transcludeFn(scope.$parent, function(content){
                    elem.append(content);
                });

                // Watch for changes to plasmid
                scope.$watchGroup(['plasmidheight','plasmidwidth','sequencelength','sequence'],function(){plasmidController.draw();});
            }
        },
        controller : ['$scope', 'SVGUtil', function($scope, SVGUtil){
            var element, trackControllers = [];

            this.init = function(elem){
                SVGUtil.api.addPlasmid(this);
                element = elem;
            };

            this.draw = function(){
                element.attr("height",$scope.plasmidheight);
                element.attr("width", $scope.plasmidwidth);
                angular.forEach(trackControllers, function(t){
                    t.draw();
                });
            };

            this.addTrack = function(trackController){
                trackControllers.push(trackController);
            };

            Object.defineProperty($scope,"center",{
                get: function() {
                    return {
                        x : Number($scope.plasmidheight)/2,
                        y : Number($scope.plasmidwidth)/2
                    };
                }
            });
    
            this.tracks = trackControllers;
            this.plasmid = $scope;
        }]
    };
}]);

app.directive("plasmidtrack", ['SVGUtil', function(SVGUtil){
    return {
        restrict: 'AE',
        type : 'svg',
        template: '<g><path></path></g>',
        replace : true,
        transclude: true,
        require: ['plasmidtrack', '^plasmid'],
        scope: {
            radius: '=',
            thickness: '='
        },
        link : {
            pre : function(scope,elem,attr,controllers,transcludeFn){
                var trackController = controllers[0], plasmidController = controllers[1], pathElem = angular.element(elem.children()[0]);
                trackController.init(pathElem, plasmidController);
            },
            post : function(scope,elem,attr,controllers,transcludeFn){

                // Manually transclude children elements
                transcludeFn(scope.$parent, function(content){
                    elem.append(content);
                });

                // Apply special style to path to allow for correct display and apply directive's properties (class, style, id, name) to the path instead of the g
                var g = angular.element(elem), path  = angular.element(elem.children()[0]);
                SVGUtil.util.swapProperties(g, path);
                path.css("fill-rule", "evenodd");

                // Watch for changes in the track
                var trackController = controllers[0];
                scope.$watchGroup(['radius','thickness'],function(){trackController.draw();});
            }
        },
        controller : ['$scope', function($scope){
            var plasmidController, element, markerControllers = [], scaleControllers = [];

            this.init = function(elem, plasmidCtrl){
                plasmidCtrl.addTrack(this);
                plasmidController = plasmidCtrl;
                this.plasmid = plasmidController.plasmid;
                element = elem;
            };

            this.draw = function(){
                var center = $scope.center;
                var path = SVGUtil.svg.path.donut(center.x, center.y, $scope.radius, $scope.thickness);
                element.attr("d", path);
                angular.forEach(markerControllers, function(m){
                    m.draw();
                });
                angular.forEach(scaleControllers, function(s){
                    s.draw();
                });
            };

            this.addMarker = function(markerController){
                markerControllers.push(markerController);
            };
   
            this.addScale = function(scaleController){
                scaleControllers.push(scaleController);
            };

            this.markergroup = function(groupName){
                var items = [];
                angular.forEach(markerControllers, function(item){
                    if (item.marker.markergroup==groupName){
                        items.push(item);
                    }
                });
                return items;
            };

            $scope.getPosition = function(pos, positionOption, radiusAdjust){
                radiusAdjust = Number(radiusAdjust || 0); pos = Number(pos);

                var POSITION_OPTION_MID = 0, POSITION_OPTION_INNER = 1, POSITION_OPTION_OUTER = 2;
                var seqLen = plasmidController.plasmid.sequencelength;

                if (seqLen>0) {
                    var radius, angle = (pos/seqLen)*360;
                    switch (positionOption){
                        case POSITION_OPTION_INNER : radius = $scope.radius + radiusAdjust; break;
                        case POSITION_OPTION_OUTER : radius = $scope.radius + $scope.thickness + radiusAdjust; break;
                        default : radius = $scope.radius + ($scope.thickness/2) + radiusAdjust; break;
                    }
                    var center = $scope.center;
                    return  SVGUtil.util.polarToCartesian(center.x, center.y , radius, angle);
                }
            };
            Object.defineProperty($scope,"center",{
                get: function() {
                    return plasmidController.plasmid.center;
                }
            });

            this.markers = markerControllers;
            this.track = $scope;
        }]
    };
}]);
app.directive("trackscale", ['SVGUtil', function(SVGUtil){
    return {
        restrict: 'AE',
        type : 'svg',
        template: '<g><path></path><g></g></g>',
        replace : true,
        transclude: true,
        require: ['trackscale', '^plasmidtrack'],
        scope: {
            interval: "=",
            offset: "=",
            ticklength: "=",
            direction: "@",
            showlabels : "@",
            labeloffset : "=",
            labelclass : "@",
            labelstyle : "@"
        },
        link : {
            pre : function(scope,elem,attr,controllers,transcludeFn){
                var scaleController = controllers[0], trackController = controllers[1], pathElem = angular.element(elem.children()[0]), groupElem = angular.element(elem.children()[1]);
                scaleController.init(pathElem, groupElem, trackController);
            },
            post : function(scope,elem,attr,controllers,transcludeFn){

                //Manually transclude children elements
                transcludeFn(scope.$parent, function(content){
                    elem.append(content);
                });

                //Apply directive's properties (class, style, id, name) to the path instead of the g
                var g = angular.element(elem), path  = angular.element(elem.children()[0]);
                SVGUtil.util.swapProperties(g, path);

                // Watch for changes to scale
                var scaleController = controllers[0];
                scope.$watchGroup(['interval','offset','ticklength','labeloffset'],function(){scaleController.draw();});


            }
        },
        controller : ['$scope', function($scope){
            var trackController, element, groupElement;
            var DEFAULT_LABELOFFSET = 15, DEFAULT_TICKLENGTH = 2;

            this.init = function(elem, groupElem, trackCtrl){
                trackCtrl.addScale(this);
                trackController = trackCtrl;
                element = elem;
                groupElement = groupElem;
            };

            this.draw = function(){
                var center = trackController.track.center;
                var path = SVGUtil.svg.path.scale(center.x, center.y, $scope.radius, $scope.interval, $scope.total, ($scope.ticklength || DEFAULT_TICKLENGTH));
                element.attr("d", path);
                if ($scope.showlabels){
                    this.drawLabel();
                }
            };

            this.drawLabel = function(){
                var center = trackController.track.center;
                var labels = SVGUtil.svg.element.scalelabels(center.x, center.y, $scope.labelradius, $scope.interval, $scope.total);
                groupElement.empty();
                for (i = 0; i <= labels.length - 1; i++) {
                    var t = angular.element(SVGUtil.svg.createNode('text'));
                    if ($scope.labelclass) { t.addClass($scope.labelclass);}
                    if ($scope.labelstyle) { t.attr('style',$scope.labelstyle);}
                    t.attr("x", labels[i].x);
                    t.attr("y", labels[i].y);
                    t.text(labels[i].text);
                    groupElement.append(t);
                }
            };

            Object.defineProperty($scope,"labelradius",{
                get: function() {
                    return Number($scope.radius) + Number(($scope.labeloffset || DEFAULT_LABELOFFSET) * ($scope.directionflg ? -1 : 1));
                }
            });
            Object.defineProperty($scope,"radius",{
                get: function() {
                    return ($scope.directionflg ? trackController.track.radius : trackController.track.radius + trackController.track.thickness) +  ($scope.directionflg ? -1 : 1) * Number($scope.offset || 0) + ($scope.directionflg ? -($scope.ticklength || DEFAULT_TICKLENGTH) : 0);
                }
            });
            Object.defineProperty($scope,"directionflg",{
                get: function() {
                    return $scope.direction=='in';
                }
            });
            Object.defineProperty($scope,"total",{
                get: function() {
                    return trackController.plasmid.sequencelength;
                }
            });
            this.scale = $scope;
        }]
    };
}]);

app.directive("trackmarker", ['SVGUtil', function(SVGUtil){
    return {
        restrict: 'AE',
        type : 'svg',
        template: '<g><path></path></g>',
        replace : true,
        transclude: true,
        require: ['trackmarker', '^plasmidtrack'],
        scope: {
            start: "=",
            end: "=",
            offsetradius: "=",
            offsetthickness: "=",
            markergroup: "@",
            arrowstartlength : "@",
            arrowstartwidth : "@",
            arrowstartangle : "@",
            arrowendlength : "@",
            arrowendwidth : "@",
            arrowendangle : "@",
            markerclick: "&"
        },
        link : {
            pre : function(scope,elem,attr,controllers,transcludeFn){
                var markerController = controllers[0], trackController = controllers[1], pathElem = angular.element(elem.children()[0]);
                markerController.init(pathElem, trackController);
            },
            post : function(scope,elem,attr,controllers,transcludeFn){

                var markerController = controllers[0];

                //Manually transclude children elements
                transcludeFn(scope.$parent, function(content){
                    elem.append(content);
                });

                //Apply directive's properties (class, style, id, name) to the path instead of the g
                var g = angular.element(elem), path  = angular.element(elem.children()[0]);
                SVGUtil.util.swapProperties(g, path);

                //Attach event handlers
                path.on("click", function(e) {
                    scope.markerclick({
                        $e: e,
                        $marker: markerController.marker
                    });
                });

                // Watch for changes to marker
                scope.$watchGroup(['start','end','offsetradius','offsetthickness'],function(){markerController.draw();});

            }
        },
        controller : ['$scope', function($scope){
            var trackController, element, markerlabelControllers = [];

            this.init = function(elem, trackCtrl){
                trackCtrl.addMarker(this);
                trackController = trackCtrl;
                element = elem;
            };

            this.draw = function(){
                element.attr("d", $scope.getPath());
                angular.forEach(markerlabelControllers, function(ml){
                    ml.draw();
                });
            };

            this.addMarkerLabel = function(markerlabelController){
                markerlabelControllers.push(markerlabelController);
            };

            $scope.getPath = function(){
                var center = trackController.track.center;
                return SVGUtil.svg.path.arc(center.x, center.y, $scope.radius, $scope.startangle, $scope.endangle, $scope.thickness, $scope.arrowstart, $scope.arrowend);
            };
            $scope.getPosition = function(hAdjust, vAdjust, hAlign, vAlign){
                var HALIGN_MIDDLE = 0 , HALIGN_BEGIN = 1, HALIGN_END = 2;
                var VALIGN_CENTER = 0, VALIGN_INNER = 1, VALIGN_OUTER = 2;

                hAdjust = Number(hAdjust || 0); vAdjust = Number(vAdjust || 0);
                var center = trackController.track.center;

                if (vAlign!==undefined && hAlign!==undefined){
                    switch (vAlign){
                        case VALIGN_INNER : radius =  $scope.radiusinner + vAdjust;break;
                        case VALIGN_OUTER : radius =  $scope.radiusouter + vAdjust;break;
                        default : radius =  $scope.radiuscenter + vAdjust;break;
                    }

                    switch (hAlign){
                        case HALIGN_BEGIN : angle =  $scope.startangle + hAdjust;break;
                        case HALIGN_END : angle =  $scope.endangle + hAdjust;break;
                        default : angle =  $scope.midangle + hAdjust;break;
                    }

                    return SVGUtil.util.polarToCartesian(center.x, center.y , radius, angle);
                }
                else {

                    var radius = {
                        outer :  $scope.radiusouter + vAdjust,
                        inner : $scope.radiusinner + vAdjust,
                        center : $scope.radiuscenter + vAdjust
                    };

                    var angle = {
                        begin : $scope.startangle + hAdjust,
                        end : $scope.endangle + hAdjust,
                        middle : $scope.midangle + hAdjust,
                    };


                    return {
                        outer : {
                            begin: SVGUtil.util.polarToCartesian(center.x, center.y , radius.outer, angle.begin),
                            middle: SVGUtil.util.polarToCartesian(center.x, center.y , radius.outer, angle.middle),
                            end: SVGUtil.util.polarToCartesian(center.x, center.y , radius.outer, angle.end),
                        },
                        center : {
                            begin: SVGUtil.util.polarToCartesian(center.x, center.y , radius.center, angle.begin),
                            middle: SVGUtil.util.polarToCartesian(center.x, center.y , radius.center, angle.middle),
                            end: SVGUtil.util.polarToCartesian(center.x, center.y , radius.center, angle.end),
                        },
                        inner : {
                            begin: SVGUtil.util.polarToCartesian(center.x, center.y , radius.inner, angle.begin),
                            middle: SVGUtil.util.polarToCartesian(center.x, center.y , radius.inner, angle.middle),
                            end: SVGUtil.util.polarToCartesian(center.x, center.y , radius.inner, angle.end),
                        }
                    };
                }

            };
            Object.defineProperty($scope,"center",{
                get: function() {
                    return trackController.track.center;
                },
            });
            Object.defineProperty($scope,"radius",{
                get: function() {
                    return trackController.track.radius + Number($scope.offsetradius || 0);
                },
            });
            Object.defineProperty($scope,"radiusinner",{
                get: function() {
                    return $scope.radius;
                },
            });
            Object.defineProperty($scope,"radiusouter",{
                get: function() {
                    return $scope.radius + $scope.thickness;
                },
            });
            Object.defineProperty($scope,"radiuscenter",{
                get: function() {
                    return $scope.radius + $scope.thickness/2;
                },
            });
            Object.defineProperty($scope,"thickness",{
                get: function() {
                    return trackController.track.thickness + Number($scope.offsetthickness || 0);
                },
            });
            Object.defineProperty($scope,"startangle",{
                get: function() {
                    return (Number($scope.start||0)/Number(trackController.plasmid.sequencelength))*360;
                },
            });
            Object.defineProperty($scope,"endangle",{
                get: function() {
                    var endAngle = (Number($scope.end||$scope.start)/Number(trackController.plasmid.sequencelength))*360;
                    endAngle += (endAngle<$scope.startangle) ? 360 : 0;
                    return endAngle;
                },
            });
            Object.defineProperty($scope,"midangle",{
                get: function() {
                    return $scope.startangle + ($scope.endangle-$scope.startangle)/2;
                },
            });
            Object.defineProperty($scope,"arrowstart",{
                get: function() {
                    return {
                        width : Number($scope.arrowstartwidth || 0),
                        length : Number($scope.arrowstartlength || 0),
                        angle : Number($scope.arrowstartangle || 0)
                    };
                }
            });
            Object.defineProperty($scope,"arrowend",{
                get: function() {
                    return {
                        width : Number($scope.arrowendwidth || 0),
                        length : Number($scope.arrowendlength || 0),
                        angle : Number($scope.arrowendangle || 0)
                    };
                }
            });

            this.marker = $scope;
        }]
    };
}]);
app.directive("markerlabel", ['SVGUtil', function(SVGUtil){
    return {
        restrict: 'AE',
        type : 'svg',
        transclude: true,
        template: function(elem, attr){
            return (attr.type=='path') ? '<g><path id="" style="fill:none;stroke:none"></path><text><textpath xlink:href="#">{{text}}</textpath></text></g>' : '<text>{{text}}</text>';
        },
        require: ['markerlabel', '^trackmarker'],
        replace : true,
        scope: {
            text : "@",
            valign : "@",
            vadjust : "@",
            halign : "@",
            hadjust : "@",
            type : "@"
        },
        link: {
            pre : function(scope,elem,attr,controllers,transcludeFn){
                var markerlabelController = controllers[0], trackMarkerController = controllers[1];
                var groupElem, pathElem, textElem;
                if (attr.type=='path'){
                    groupElem = angular.element(elem[0]);
                    pathElem = angular.element(elem.children()[0]);
                    textElem = angular.element(elem.children()[1]);
                } else {
                    textElem = angular.element(elem[0]);
                }
                markerlabelController.init(textElem, groupElem, pathElem, trackMarkerController);
            },
            post : function(scope,elem,attr,controllers,transcludeFn){
                transcludeFn(scope.$parent, function(content){
                    elem.append(content);
                });

                //Apply directive's properties (class, style, id, name) to the text 
                if (attr.type=='path'){
                    var g = angular.element(elem), text  = angular.element(elem.children()[1]);
                    SVGUtil.util.swapProperties(g, text);
                }
            }
        },
        controller : ['$scope', function($scope){
            var markerController, textElement, pathElement, groupElement;

            this.init = function(textElem, groupElem, pathElem, markerCtrl){
                markerCtrl.addMarkerLabel(this);
                markerController = markerCtrl;
                textElement = textElem;
                pathElement = pathElem;
                groupElement = groupElem;
            };

            this.draw = function(){
                var HALIGN_CENTER = 'center' , HALIGN_LEFT = 'left', HALIGN_RIGHT = 'right';

                if ($scope.type=='path'){
                    var textPathElem = angular.element(textElement.children()[0]);
                    pathElement.attr("d",$scope.getPath($scope.hadjust, $scope.vadjust, $scope.halign, $scope.valign));
                    switch ($scope.halign) {
                        case HALIGN_LEFT :
                            textElement.attr("text-anchor","start");
                            textPathElem.attr("startOffset","0%");
                            break;
                        case HALIGN_RIGHT :
                            textElement.attr("text-anchor","end");
                            textPathElem.attr("startOffset","100%");
                            break;
                        default :
                            textElement.attr("text-anchor","middle");
                            textPathElem.attr("startOffset","50%");
                            break;
                    }
                    var id = 'TPATH' + (Math.random() + 1).toString(36).substring(3,7);
                    pathElement.attr("id", id);
                    textPathElem.attr("xlink:href",'#' + id);
                }
                else {
                    var halign = $scope.halign || 0;
                    var valign = $scope.valign || 0;

                    var pos = markerController.marker.getPosition($scope.hadjust, $scope.vadjust, halign, valign);
                    textElement.attr("x", pos.x);
                    textElement.attr("y", pos.y);
                }
            };

            $scope.getPath = function(hAdjust, vAdjust, hAlign, vAlign){
                var VALIGN_CENTER = "center", VALIGN_INNER = "inner", VALIGN_OUTER = "outer";
                var HALIGN_CENTER = 'center' , HALIGN_LEFT = 'left', HALIGN_RIGHT = 'right';

                var marker = markerController.marker, center = marker.center, radius, startAngle, endAngle;

                switch (vAlign){
                    case VALIGN_INNER : radius = marker.radiusinner ;break;
                    case VALIGN_OUTER : radius = marker.radiusouter ;break;
                    default : radius = marker.radiuscenter ;break;
                }

                switch (hAlign){
                    case HALIGN_LEFT :  startAngle = marker.startangle ;
                                        endAngle = marker.startangle + 359.99 ;
                                        break;

                    case HALIGN_RIGHT : startAngle = marker.endangle + 1 ;
                                        endAngle = marker.endangle ;
                                        break;

                    default :   startAngle = marker.midangle + 180.05 ;
                                endAngle = marker.midangle + 179.95 ;
                                break;
                }

                return SVGUtil.svg.path.arc(center.x, center.y, radius + Number(vAdjust || 0) , startAngle + Number(hAdjust || 0), endAngle + Number(hAdjust || 0), 1);
            };
            
            this.markerlabel = $scope;
        }]
    };
}]);

