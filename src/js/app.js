import * as d3 from "d3"
import * as topojson from "topojson"

var maps = [{
	"label" : "NSW",
	"centre" : [147,-33],
	"zoom" : 3.9,
	"active" : false
},{
	"label" : "Sydney",
	"centre" : [151,-34],
	"zoom" : 35,
	"active" : true
}]


var circlesOn = true


function cleanNames(name) {
	name = name.replace(" (C)", "")
	name = name.replace(" (C)", "")
	name = name.replace(" (NSW)", "")
	return name
}

function init(dataFeed, lga, places, trend) {
	console.log("dataFeed",dataFeed)
	var context = d3.select(".nswMap")
	const container = d3.select("#nswCoronaMapContainer")
	var isMobile;
	var windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	var windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	if (windowWidth < 610) {
			isMobile = true;
			maps[1].zoom = 50
	}	

	if (windowWidth >= 610){
			isMobile = false;
	}

	var width = document.querySelector("#nswCoronaMapContainer").getBoundingClientRect().width
	
	var height = width*0.7
	
	if (windowHeight > windowWidth) {
		height = width*0.9
	}

	console.log("lga",lga)

	var ratio = (maps[0].active) ? maps[0].zoom : maps[1].zoom

	var centre = (maps[0].active) ? maps[0].centre : maps[1].centre

	var projection = d3.geoMercator()
                    .center(centre)
                    .scale(width*ratio)
                    .translate([width/2,height/2])

	container.select("#nswMap").remove()
	container.select(".tooltip").remove()

	// var data = dataFeed
	var extent = d3.extent(dataFeed, d => +d.count)

	// console.log(extent)
	var lastUpdated = dataFeed[0].today

	context.select("#lastUpdated").text(lastUpdated)

	var max = d3.max(dataFeed, d => d.count)

	extent = [1,max]

	// trend.forEach( d => {
	// 	d.lga = cleanNames(d.lga)
	// })

	var mapData = d3.map(dataFeed, function(d) { return d.place; });
	var mapTrend = d3.map(trend, function(d) { return d.lga });

	console.log("trend",mapData)

	lga.objects['nsw-lga-2019'].geometries.forEach(function(d) {
		// var entry = mapData.get(d.properties.LGA_NAME19)
		// console.log(entry['Cases'])
		if (mapData.has(d.properties.LGA_NAME19)) {
			var cases

			if (mapData.get(d.properties.LGA_NAME19)['count'] == "1-4") {
				cases = 2
				
			}
			else {
				cases = +mapData.get(d.properties.LGA_NAME19)['count']
			}
			
			d.properties.cases = cases
			

			// if (cases > 0) {
			// 		d.properties.casesPer100K = (cases / population[d.properties.LGA_NAME19]) * 100000
			// 	}
			// else {
			// 	d.properties.casesPer100K = 0
			// }
		}

		else {
			d.properties.cases = 0
			d.properties.casesPer100K = 0
		}


		if (mapTrend.has(d.properties.LGA_NAME19)) {
			d.properties.change = +mapTrend.get(d.properties.LGA_NAME19)['change']
			d.properties.this_week = +mapTrend.get(d.properties.LGA_NAME19)['this_week']
			d.properties.last_week = +mapTrend.get(d.properties.LGA_NAME19)['last_week']
		}

		else {
			d.properties.change = ""
			d.properties.this_week = 0
			d.properties.last_week = 0
		}


	})

	var lockdownAreas = ["Fairfield (C)", 
						"Liverpool (C)", 
						"Canterbury-Bankstown (A)", 
						"Blacktown (C)",
						"Cumberland (A)",
						"Parramatta (C)",
						"Georges River (A)",
						"Campbelltown (C) (NSW)",
						"Bayside (A)",
						"Burwood (A)",
						"Strathfield (A)",
						"Penrith (C)"]


	// var extent = d3.extent(vic.objects['vic-lga-2019'].geometries, d => { 
	// 	if (d.properties.casesPer100K > 0) {
	// 		return d.properties.casesPer100K
	// 	}
	// })

	// console.log("extent",extent)

	var colors = d3.scaleLinear()
		.range(['#fee0d2','#a50f15'])
		.domain([0.5,50])

	var divColors = d3.scaleThreshold()
		.range(['#d73027','#f46d43','#fdae61','#fee090','#e0f3f8','#abd9e9','#74add1','#4575b4'].reverse())
		.domain([-6,-4,-2,0,2,4,6])

	function trendLang(slope) {
		if (slope > 0) {
			return "Increasing"
		}

		else if (slope < 0) {
			return "Decreasing"
		}

		else if (slope == 0) {
			return "No change"
		}

		else if (slope === "") {
			return "Not enough cases"
		}

		
	}

	var svg = container.append("svg")	
	                .attr("width", width)
					.attr("height", height)
	                .attr("id", "nswMap")
	                .attr("overflow", "hidden")
	                .on("mousemove", tooltipMove)

	var tooltip = d3.select("#nswCoronaMapContainer").append("div")
            .attr("class", "tooltip")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("z-index", "20")
            .style("visibility", "hidden")
            .style("top", "30px")
            .style("left", "55px");                
              
	var defs = svg.append("defs")                

	defs
		.append("pattern")
		 .attr('id', 'diagonalHatch')
	    .attr('patternUnits', 'userSpaceOnUse')
	    .attr('width', 8)
	    .attr('height', 8)
	    .attr("patternTransform", "rotate(60)")
	  .append('rect')
	    .attr("width",1)
	    .attr("height",8)
	    .attr("transform", "translate(0,0)")
	    .attr("fill", "#767676")



	var features = svg.append("g")

	var filterPlaces = places.features.filter(function(d){ 
		if (isMobile) {
			return d.properties.scalerank < 2	
		}

		else {
			return d.properties.scalerank < 4		
		}
		
	});

	function contains(a, b) {
	    // array matches
	    if (Array.isArray(b)) {
	        return b.some(x => a.indexOf(x) > -1);
	    }
	    // string match
	    return a.indexOf(b) > -1;
	}


	var path = d3.geoPath()
	    .projection(projection);

	var geo = topojson.feature(lga,lga.objects['nsw-lga-2019']).features   

	console.log("geo",geo)

	var lockdownLgas = geo.filter(d => lockdownAreas.includes(d.properties.LGA_NAME19))

	console.log("lockdownLgas", lockdownLgas)
	// console.log("postcodeGeo", postcodeGeoLockdown)

	var centroids = geo.map(function (feature){
		// console.log(feature)
    	feature.properties['centroid'] = path.centroid(feature);
    	return feature.properties
  	});

	var rMax = 30

	if (width <= 900) {
		rMax = 20
	}

	if (width <= 620) {
		rMax = 15
	}


	const radius = d3.scaleSqrt()
		.range([2, rMax])

	radius.domain(extent)

	features.append("g")
	    .selectAll("path")
	    .attr("id","lgas")
	    .data(geo)
	    .enter().append("path")
	        .attr("class", "lga")
	        .attr("fill", (d) => {

	        	if (circlesOn) {
	        		return "#eaeaea"
	        	}

	        	else {
	        		if (d.properties.change === "") {
						return "#eaeaea"
					}

		        	else {
		        		return divColors(d.properties.change)
		        		
		        	}
	        	}
	 
	        })
	        .attr("stroke", "#bcbcbc")
	        .attr("data-tooltip","")
	        .attr("d", path)
	        .on("mouseover", tooltipIn)
            .on("mouseout", tooltipOut)
	          
	          

	features.append("g")
	    .selectAll("path")
	    .attr("id","metro-lockdown")
	    .data(lockdownLgas)
	    .enter().append("path")
	        .attr("fill", "url(#diagonalHatch)")
	        .attr("stroke", "#767676")
	        .style("pointer-events", "none")
	        // .style("stroke-dasharray", ("3, 2"))
	        .attr("stroke-width", "1px")
	        .attr("d", path);           
        
		 features.selectAll("text")
            .data(filterPlaces)
            .enter()
            .append("text")
            .text((d) => d.properties.name)
            .attr("x", (d) => projection([d.properties.longitude, d.properties.latitude])[0] + 20)
            .attr("y", (d) => projection([d.properties.longitude, d.properties.latitude])[1])
            .attr("text-anchor", "start")
            .attr("class","label")        


	var mapCircles1 = features.selectAll(".mapCircle")
						.data(centroids);	        

	mapCircles1					
		.enter()
		.append("circle")
		.attr("class", "mapCircle")
		.attr("title",d => d.LGA_NAME19)
		.attr("cx",d => { 
			// console.log(d.LGA_NAME19)
			return d.centroid[0]
		})
		.attr("cy",d => d.centroid[1])
		.attr("fill", d => { 
			if (d.change === "") {
				return "none"
			}
			else {
				
				return divColors(d.change)
			}
		})
		.attr("r", function(d) { 

			if (d.cases > 0) {
				return radius(d.cases) 

			}
			else {
				return 0
			}
		})
		.style("visibility", d => {
			if (circlesOn) {
	        		return "visible"
	        	}
	        else {
	        	return "hidden"
	        }	
		})  


   	context.select("#keyDiv svg").remove();

   	var keyWidth = document.querySelector("#keyDiv").getBoundingClientRect().width
   	// console.log(keyWidth)

    var keySvg = context.select("#keyDiv").append("svg")	
	                .attr("width", keyWidth)
					.attr("height", 50)
	                .attr("id", "key")
	                .attr("overflow", "hidden");

	var keySquare = keyWidth / 8;
    var barHeight = 15
    var textHeight = 30            	

    // console.log(divColors.domain())

	divColors.range().forEach(function(d, i) {

        keySvg.append("rect")
            .attr("x", keySquare * i)
            .attr("y", 20)
            .attr("width", keySquare)
            .attr("height", barHeight)
            .attr("fill", d)
            .attr("stroke", "#dcdcdc")
    })
            
    divColors.domain().forEach(function(d, i) {

            keySvg.append("text")
	            .attr("x", (i + 1) * keySquare)
	            .attr("text-anchor", "middle")
	            .attr("y", textHeight + 20)
	            .attr("class", "keyLabel keyText")
	            .text(b => { 
	            	if (d == 6) {
	            		return ">6"
	            	} 

	            	else if (d == -6) {
	            		return "<-6"
	            	}

	            	else {
	            		return d
	            	} 
	            })
      
     
    })

    keySvg.append("text")
        .attr("x", keyWidth/2 + 5)
        .attr("text-anchor", "start")
        .attr("y", 16)
        .attr("class", "keyText keyLabel")
        .text("Cases increasing →")

    keySvg.append("text")
        .attr("x", keyWidth/2 - 5)
        .attr("text-anchor", "end")
        .attr("y", 16)
        .attr("class", "keyText keyLabel")
        .text("← Cases decreasing")    


    context.select("#keyDiv2 svg").remove();

    var keyWidth2 = document.querySelector("#keyDiv2").getBoundingClientRect().width

    var key2offset = 20

    var keySvg2 = context.select("#keyDiv2").append("svg")	
	                .attr("width", keyWidth2)
					.attr("height", 80)
	                .attr("id", "key2")
	                .attr("overflow", "hidden");    

	keySvg2.append("circle")
            .attr("cx",60 + key2offset)
			.attr("cy",40)
            .attr("class", "keyCircle")
            .attr("r", radius(extent[1])) 

    keySvg2.append("text")
            .attr("x",60 + key2offset)
			.attr("y",45)
            .attr("class", "keyText keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[1])         

    // Little circle        

    keySvg2.append("circle")
            .attr("cx",10 + key2offset)
			.attr("cy",31)
            .attr("class", "keyCircle")
            .attr("r", radius(1))

    keySvg2.append("text")
            .attr("x",10 +key2offset)
			.attr("y",45)
            .attr("class", "keyText keyLabel")
            .attr("text-anchor", "middle")
            .text(extent[0]) 


    context.select("#keyDiv3 svg").remove();        

    var keyWidth3 = document.querySelector("#keyDiv3").getBoundingClientRect().width

    var keySvg3 = context.select("#keyDiv3").append("svg")	
	                .attr("width", keyWidth3)
					.attr("height", 80)
	                .attr("id", "key3")
	                .attr("overflow", "hidden");          

		keySvg3.append("rect")
            .attr("x",1)
			.attr("y",10)
   			.attr("width", 30)
   			.attr("height", 30)
   			.attr("fill", "url(#diagonalHatch)")
	        .attr("stroke", "#767676")  	


	// keySvg3.append("rect")
 //            .attr("x",1)
	// 		.attr("y",10)
 //   			.attr("width", 30)
 //   			.attr("height", 30)
 //   			.attr("fill", "none")
	//         .attr("stroke", "#000")
	//         .attr("stroke-width", 2)
	//         .attr('stroke-dasharray', '3,2')     


	// keySvg3.append("text")
 //            .attr("x",1)
	// 		.attr("y",60)
 //            .attr("class", "keyText keyLabel")
 //            .text("Metro Melbourne")    

 //     keySvg3.append("text")
 //            .attr("x",1)
	// 		.attr("y",75)
 //            .attr("class", "keyText keyLabel")
 //            .text("lockdown")                  
        
   	keySvg3.append("text")
            .attr("x",0)
			.attr("y",60)
            .attr("class", "keyText keyLabel")
            .text("LGA lockdowns")    

   //   keySvg3.append("text")
   //          .attr("x",0)
			// .attr("y",75)
   //          .attr("class", "keyText keyLabel")
   //          .text("down postcodes")           



    context.select("#togglePostcodes").on("click", function() {  
    
    	var pc = context.select("#postcodes")

    	console.log(postcodesVisible)

    	if (postcodesVisible) {
    		pc.attr("opacity", 0)
    		postcodesVisible = false
    	}

    	else {
    		pc.attr("opacity", 1)
    		postcodesVisible = true

    	}

    })      


    context.select("#toggleCircles").on("click", function() {  
    
    	if (circlesOn) {
    		features.selectAll(".mapCircle").style("visibility", "hidden")
    		features.selectAll(".lga").attr("fill", d=> {
    			if (d.properties.change === "") {
						return "#eaeaea"
					}

		        	else {
		        		
		        		return divColors(d.properties.change)
		        	}
    		})
    			
    		circlesOn = false
    	}

    	else {
    		features.selectAll(".mapCircle").style("visibility", "visible")
    		features.selectAll(".lga").attr("fill", "#eaeaea")
    		circlesOn = true

    	}

    })


    function tooltipMove(d) {
            var leftOffset = 0
            var rightOffset = 0
            var mouseX = d3.mouse(this)[0]
            var mouseY = d3.mouse(this)[1]
            var half = width / 2;
            if (mouseX < half) {
                context.select("#tooltip").style("left", mouseX + "px");
                
            } else if (mouseX >= half) {
                context.select("#tooltip").style("left", (mouseX - 200) + "px");
                
            }

            if (mouseY < (height / 2)) {
                context.select("#tooltip").style("top", (mouseY + 30) + "px");
            } else if (mouseY >= (height / 2)) {
                context.select("#tooltip").style("top", (mouseY - 120) + "px");
            }
            
        }

    function tooltipIn(d) {

            // console.log(d.properties)
            var html
            if (d.properties.change != "") {
            	 html = `<b>${d.properties.LGA_NAME19}</b><br>
            			Trend*: ${trendLang(d.properties.change)}<br>
            			Total cases, past 7 days: ${d.properties.this_week}<br>
            			Total cases, prev. 7 day period: ${d.properties.last_week}<br>
            			Total in past 30 days: ${d.properties.cases}<br>
            			`
            }
           
           	else {
           		 html = `<b>${d.properties.LGA_NAME19}</b><br>
            			Trend*: ${trendLang(d.properties.change)}<br>
            			Total in past 30 days: ${d.properties.cases}<br>
            			`
           	}

            context.select(".tooltip").html(html).style("visibility", "visible");
        
        }

    function tooltipOut(d) {
        context.select(".tooltip").style("visibility", "hidden");
    }            


} // end init


Promise.all([
		d3.json('https://interactive.guim.co.uk/2020/07/nsw-corona-map/recentLocal.json'),
		d3.json('<%= path %>/assets/nsw-lga-2019.json'),
		d3.json('<%= path %>/assets/places_au.json'),
		d3.json('https://interactive.guim.co.uk/2020/07/nsw-corona-map/nswChange.json')
		])
		.then((results) =>  {
			init(results[0], results[1], results[2], results[3])

			d3.select(".nswMap #zoom2").on("click", function() {

				if (maps[0].active) {
					maps[0].active = false;
					maps[1].active = true;
					d3.select(this).html("Zoom to NSW")
				} else {
					maps[0].active = true;
					maps[1].active = false;
					d3.select(this).html("Zoom to Sydney")
				}

				init(results[0], results[1], results[2], results[3])

			})


			var to=null
			var lastWidth = document.querySelector("#nswCoronaMapContainer").getBoundingClientRect()
			window.addEventListener('resize', function() {
				var thisWidth = document.querySelector("#nswCoronaMapContainer").getBoundingClientRect()
				if (lastWidth != thisWidth) {
					window.clearTimeout(to);
					to = window.setTimeout(function() {
						    init(results[0], results[1], results[2], results[3])
						}, 100)
				}
			
			})

});