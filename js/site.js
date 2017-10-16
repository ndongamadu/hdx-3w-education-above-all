//configuration object

var config = {
    data: "data/data.json",
    whoFieldName: "Organisation",
    whatFieldName: "Interventions",
    whereFieldName: "ISO3",
    sum: false,
    sumField: "Total OOSC",
    geo: "data/countries.json",
    joinAttribute: "id",
    nameAttribute: "name",
    color: "#03a9f4",
    projectField: "Project_name"
};

//function to generate the 3W component
//data is the whole 3W Excel data set
//geom is geojson file

function generate3WComponent(config, data, geom) {

    var lookup = genLookup(geom, config);

    var whoChart = dc.rowChart('#hdx-3W-who');
    var whatChart = dc.rowChart('#hdx-3W-what');
    var projectChart = dc.rowChart('#project');
    var whereChart = dc.leafletChoroplethChart('#hdx-3W-where');

    var ooscNumber = dc.numberDisplay('#oosc');
    var countriesNumber = dc.numberDisplay('#numCountries')


    var cf = crossfilter(data);

    var whoDimension = cf.dimension(function (d) {
        return d[config.whoFieldName];
    });
    var whatDimension = cf.dimension(function (d) {
        return d[config.whatFieldName];
    });
    var whereDimension = cf.dimension(function (d) {
        return d[config.whereFieldName];
    });
    var projectDimension = cf.dimension(function (d) {
        return d[config.projectField];
    });


    // var whoGroup = whoDimension.group();
    // var whatGroup = whatDimension.group();
    // var whereGroup = whereDimension.group();


    if (config.sum) {
        var whoGroup = whoDimension.group().reduceSum(function (d) {
            return parseInt(d[config.sumField]);
        });
        var whatGroup = whatDimension.group().reduceSum(function (d) {
            return parseInt(d[config.sumField]);
        });
        var projectGroup = projectDimension.group().reduceSum(function (d) {
            return parseInt(d[config.sumField]);
        });
        var whereGroup = whereDimension.group().reduceSum(function (d) {
            return parseInt(d[config.sumField]);
        });
    } else {
        var whoGroup = whoDimension.group();
        var whatGroup = whatDimension.group();
        var whereGroup = whereDimension.group();
        var projectGroup = projectDimension.group();
    }


    var projectGroup = projectDimension.group().reduceSum(function (d) {
        return parseInt(d[config.sumField]);
    });


    var gp = cf.groupAll().reduce(
        function (p, v) {
            p.oosc += +v[config.sumField];

            if (v["Country"] in p.country)
                p.country[v["Country"]]++;
            else {
                p.country[v["Country"]] = 1;
                p.numCountries++;
            }
            return p;

        },
        function (p, v) {
            p.oosc -= +v[config.sumField];

            p.country[v["Country"]]--;
            if (p.country[v["Country"]] == 0) {
                delete p.country[v["Country"]];
                p.numCountries--;
            }

            if (p.oosc < 0) p.oosc = 0;
            if (p.numCountries < 0) p.numCountries = 0;

            return p;
        },

        function () {
            return {
                oosc: 0,
                numCountries: 0,
                country: {}
            };
        }
    );

    var all = cf.groupAll();

    whoChart.width($('#hxd-3W-who').width()).height(400)
        .dimension(whoDimension)
        .group(whoGroup)
        .elasticX(true)
        .data(function (group) {
            return group.top(10);
        })
        .labelOffsetY(13)
        .colors([config.color])
        .colorAccessor(function (d, i) {
            return 0;
        })
        .renderTitle(false)
        .xAxis().ticks(0);

    whatChart.width($('#hxd-3W-what').width()).height(400)
        .dimension(whatDimension)
        .group(whatGroup)
        .elasticX(true)
        .data(function (group) {
            return group.top(10);
        })
        .labelOffsetY(13)
        .colors([config.color])
        .colorAccessor(function (d, i) {
            return 0;
        })
        .renderTitle(false)
        .xAxis().ticks(0);

    projectChart.width($('#hxd-3W-what').width()).height(400)
        .dimension(projectDimension)
        .group(projectGroup)
        .elasticX(true)
        .data(function (group) {
            return group.top(15);
        })
        .labelOffsetY(13)
        .colors([config.color])
        .colorAccessor(function (d, i) {
            return 0;
        })
        .renderTitle(true)
        .title(function (d) {
            return d.value;
        })
        .xAxis().ticks(5);

    var getTotalOosc = function (d) {
        return d.oosc;
    };

    var getCountries = function (d) {
        return parseFloat(d.numCountries);
    };

    var formatComma = d3.format(',');

    ooscNumber.group(gp)
        .formatNumber(d3.format(".3s"))
        .valueAccessor(getTotalOosc);
    //.formatNumber();

    countriesNumber.group(gp)

        .formatNumber(d3.format(".3s"))

        .valueAccessor(getCountries);

    dc.dataCount('#count-info')
        .dimension(cf)
        .group(all);

    whereChart.width($('#hxd-3W-where').width()).height(360)
        .dimension(whereDimension)
        .group(whereGroup)
        .center([0, 0])
        .zoom(0)
        .geojson(geom)
        .colors(['#CCCCCC', config.color])
        .colorDomain([0, 1])
        .colorAccessor(function (d) {
            if (d > 0) {
                return 1;
            } else {
                return 0;
            }
        })
        .featureKeyAccessor(function (feature) {
            return feature.properties[config.joinAttribute];
        }).popup(function (d) {
            return lookup[d.key];
        })
        .renderPopup(true);

    dc.renderAll();

    var map = whereChart.map();

    zoomToGeom(geom);


    function zoomToGeom(geom) {
        var bounds = d3.geo.bounds(geom);
        map.fitBounds([[bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]]);
    }

    function genLookup(geojson, config) {
        var lookup = {};
        geojson.features.forEach(function (e) {
            lookup[e.properties[config.joinAttribute]] = String(e.properties[config.nameAttribute]);
        });
        return lookup;
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function hxlProxyToJSON(input, headers) {
    var output = [];
    var keys = []
    input.forEach(function (e, i) {
        if (i == 0) {
            e.forEach(function (e2, i2) {
                var parts = e2.split('+');
                var key = parts[0]
                if (parts.length > 1) {
                    var atts = parts.splice(1, parts.length);
                    atts.sort();
                    atts.forEach(function (att) {
                        key += '+' + att
                    });
                }
                keys.push(key);
            });
        } else {
            var row = {};
            e.forEach(function (e2, i2) {
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

//load 3W data

var dataCall = $.ajax({
    type: 'GET',
    url: config.data,
    dataType: 'json',
});

//load geometry

var geomCall = $.ajax({
    type: 'GET',
    url: config.geo,
    dataType: 'json',
});

//when both ready construct 3W

$.when(dataCall, geomCall).then(function (dataArgs, geomArgs) {
    var data = dataArgs[0]; //hxlProxyToJSON(dataArgs[0]);
    var geom = geomArgs[0];
    geom.features.forEach(function (e) {
        e.properties[config.joinAttribute] = String(e.properties[config.joinAttribute]);
    });
    generate3WComponent(config, data, geom);
});
