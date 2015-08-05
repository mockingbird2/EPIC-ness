var UPDATE_DELAY = 3 // Seconds (waiting after input)
var DEBUG = false

var yearData = [{'year': '2010'}, {'year': '2011'}, {'year': '2012'}, {'year': '2013'}],
	monthData = [{'month': 1}],
	weekData = [{'week': 1}]

var selectedYears = [1],
		selectedMonths = [0, 1],
		selectedWeeks = [1, 4]

var northEast,
	southWest,
	zoomLevel

var calmapSelection = [[1, 0], [7, 23]] // From Monday 0:00 'til Sunday 23:00

var locked = false

var loadingBar

var app = angular.module('myApp', ['angular-loading-bar', 'ngAnimate'])
  .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    // cfpLoadingBarProvider.includeSpinner = false
		// cfpLoadingBarProvider.latencyThreshold = 1000
    // cfpLoadingBarProvider.startSize = 0.01
    cfpLoadingBarProvider.autoIncrement = false
  }])
	.controller('ExampleCtrl', function ($scope, $http, $timeout, cfpLoadingBar) {
		loadingBar = cfpLoadingBar
	})

function incBarSlowly(limit) {
	var status = loadingBar.status()
	var step = (Math.random() * 3) * (limit - status) / 100
	loadingBar.set(status+step)
	if (status+step < limit) {
		setTimeout(incBarSlowly, 250, limit)
	}
}

// --- OBSERVER ---------------------------------------------- //

$(function initObserver() {
	// Barcharts
	initBarcharts() // Generates barcharts with empty data

	// Calmap
	displayCalmap() // Generates calmap with empty data

	// Heatmap
	initHeatmap() // Generates heatmap with an event listener (->First query)
})

// -- Variable updates --------------------------------------- //

function changeBarchartSelection(barData) {
	// Different behavior for each barchart ("year", "moth" or "week")
	var name = (barData != null) ? Object.keys(barData)[0] : "year"

	// Store clicked element
	handleNewBarElement(barData, name)

	// Update whole frontend (barcharts, heatmap, calmap)
	requestUpdateBarcharts(name)
		.then(function(name){
			if (requestLock()) {
				incBarSlowly(0.6)
				updateBarcharts(name)
					.then(function(){
						loadingBar.set(0.6)
						incBarSlowly(0.8)
						return updateHeatmap()
					}, debugRejectLog)
					.then(function(){
						loadingBar.set(0.8)
						incBarSlowly(0.995)
						return updateCalmap()
					}, debugRejectLog)
					.then(releaseLock, debugRejectLog)
			} else {
				debugLog('Barcharts: Couldn\'t request an actions lock')
			}
		}, debugRejectLog)
}

var firstTime = true
function setHeatmapBounds(southWestBound, northEastBound, newZoomLevel) {
	// Check for changes because of multiple calls by the event listener
	//console.log(southWestBound, northEastBound, newZoomLevel, southWest)
	if (!southWest || !northEast ||
			southWest.lat != southWestBound.lat || southWest.long != southWestBound.long ||
			northEast.lat != northEastBound.lat || northEast.long != northEastBound.long) {

			// TODO Für Paul: So würde es aussehen für Multithreaded Connections:
			/*
			startedThreads = 0
			allThreadsFinished = function() {
				startedThreads--
				if (startedThreads <= 0) {
					releaseLock()
				}
			}
			startedThreads++
			requestUpdateHeatmap(false, southWestBound, northEastBound, newZoomLevel).then(allThreadsFinished, debugRejectLog)
			startedThreads++
			requestUpdateCalmap(false).then(allThreadsFinished, debugRejectLog)
			if (firstTime) {
				firstTime = false
				startedThreads++
				// Load function only for initialization
				loadBarchartsData().then(allThreadsFinished, debugRejectLog)
			}
			*/

			requestUpdateHeatmap(false, southWestBound, northEastBound, newZoomLevel)
				.then(function(view){
					if (requestLock()){
						incBarSlowly(0.2)
						updateHeatmap(view)
							.then(function(){
								loadingBar.set(0.2)
								incBarSlowly(0.4)
								return updateCalmap()
							}, debugRejectLog)
							.then(function(){
								if (firstTime){
									firstTime = false
									loadingBar.set(0.4)
									incBarSlowly(0.995)
									return loadBarchartsData()
								} else {
									var defer = Q.defer()
									defer.resolve()
									return defer.promise
								}
							}, debugRejectLog)
							.then(releaseLock, debugRejectLog)
					} else{
						debugLog('Heatmap: Couldn\'t request an actions lock')
					}
				}, debugRejectLog)
	}
}

function setCalmapSelection(selCells) {
	// Only save first and last entry, because the selected cells form a rectangle
	calmapSelection = [selCells[0], selCells[selCells.length-1]]
	requestUpdateHeatmap()
		.then(function(){
			if (requestLock()) {
				incBarSlowly(0.995)
				updateHeatmap()
					.then(releaseLock, debugRejectLog)
			}
		}, debugRejectLog)
}

function requestLock() {
	if (locked) {
		return false
	} else {
		debugLog('! Actions locked !')
		disableHeatmapControl()
		disableCalmapControl()
		disableBarchartsControl()
		showLoadingAnimation()
		locked = true
		return true
	}
}

function isLocked() {
	return locked
}

function releaseLock() {
	if (locked) {
		debugLog('! Actions lock released !')
		enableHeatmapControl()
		enableCalmapControl()
		enableBarchartsControl()
		hideLoadingAnimation()
		locked = false
		return true
	} else {
		return false
	}
}

function debugLog(str) {
	if (DEBUG) {
		console.log(str)
	}
}

function debugRejectLog() {
	// If error occurs -> log error and release lock
	if (DEBUG) {
		console.log('QReject - Arguments: \n'+arguments.join(' \n'))
	}
	if (isLocked()) {
		releaseLock()
	}
}

function showLoadingAnimation() {
	//$('.loadingAnimation').css('display','')
	if (loadingBar.status() != 0) {
		//loadingBar.set(0)
		setTimeout(function(){
			loadingBar.start()
		}, 1000)
	} else {
		loadingBar.start()
	}
}

function hideLoadingAnimation() {
	//$('.loadingAnimation').css('display','none')
	loadingBar.complete()
	loadingBar.set(1)
}

// --- UPDATES ----------------------------------------------- //

function cancelUpdate() {
	barchartsCallID++
	heatmapCallID++
	calmapCallID++
}

var barchartsCallID = -1
function requestUpdateBarcharts(name, dontWait) {
	debugLog('Request Barcharts Update ('+name+')')
  var defer = Q.defer()
	var delay = (barchartsCallID >= 0 && !dontWait) ? UPDATE_DELAY * 1000 : 500

	setTimeout(function(myID){
		// Check ID
		if (myID == barchartsCallID) {
			defer.resolve(name)
		} else {
			defer.reject()
		}
	}, delay, ++barchartsCallID)
	return defer.promise
}

function updateBarcharts(name) {
	debugLog('Update Barcharts ('+name+')')
	var defer = Q.defer()
	if (!name || name == "year") {
		// Loads new data, reloads bar chart and releases lock
		updateMonthsWeeks(selectedYears, selectedMonths)
			.then(defer.resolve, defer.reject)
	} else if (name == "month") {
		// Loads new data, reloads bar chart and releases lock
		updateWeeks(selectedYears, selectedMonths)
			.then(defer.resolve, debug.reject)
	} else { // if (name == "week") {
		// No bar chart changes
		defer.resolve()
	}
	return defer.promise
}

var heatmapCallID = -1
function requestUpdateHeatmap(dontWait, newSouthWest, newNorthEast, newZoomLevel) {
	debugLog('Request Heatmap Update')
  var defer = Q.defer()
	var delay = (heatmapCallID >= 0 && !dontWait) ? UPDATE_DELAY * 1000 : 500
	debugLog(newSouthWest, newNorthEast, newZoomLevel)
	if (!newSouthWest || !newNorthEast || newZoomLevel == null) {
		newSouthWest = southWest
		newNorthEast = northEast
		newZoomLevel = zoomLevel
	}
	setTimeout(function(myID, newViewData){
		// Check ID
		if (myID == heatmapCallID) {
			defer.resolve(newViewData)
		} else {
			defer.reject()
		}
	}, delay, ++heatmapCallID, {newSouthWest, newNorthEast, newZoomLevel})
	return defer.promise
}

function updateHeatmap(viewData) {
	debugLog('Update Heatmap')
	var defer = Q.defer()
	years = selectedYears.map(function(index){return yearData[index]['year']})
	months = selectedMonths.map(function(index){return (index+1)+""})
	weeks = selectedWeeks.map(function(index){return (index+1)+""})

	if (!viewData) {
		// If not called by a heatmap change take the old view
		viewData = {newSouthWest: southWest, newNorthEast: northEast, newZoomLevel: zoomLevel}
	}

	$.ajax({
		type: "POST",
		url: "/getHeatmapData",
		data: {
			"years": years,
			"months": months,
			"weeks": weeks,
			"dayHours": calmapSelection,
			"southWest": viewData.newSouthWest,
			"northEast": viewData.newNorthEast,
			"zoomLevel": viewData.newZoomLevel
		},
		success: function(data) {
			regenerateHeatmapLayer(data)
			southWest = {'lat': viewData.newSouthWest.lat, 'long': viewData.newSouthWest.long}
			northEast = {'lat': viewData.newNorthEast.lat, 'long': viewData.newNorthEast.long}
			zoomLevel = viewData.newZoomLevel
			defer.resolve()
		},
		error: defer.reject
	})
	return defer.promise
}

var calmapCallID = -1
function requestUpdateCalmap(dontWait) {
	debugLog('Request Calmap Update')
  var defer = Q.defer()
	var delay = (calmapCallID >= 0 && !dontWait) ? UPDATE_DELAY * 1000 : 500
	setTimeout(function(myID){
		// Check ID
		if (myID == calmapCallID) {
			defer.resolve()
		} else {
			defer.reject()
		}
	}, delay, ++calmapCallID)
	return defer.promise
}

function updateCalmap() {
	debugLog('Update Calmap')
	var defer = Q.defer()
	years = selectedYears.map(function(index){return yearData[index]['year']})
	months = selectedMonths.map(function(index){return (index+1)+""})
	weeks = selectedWeeks.map(function(index){return (index+1)+""})

	$.ajax({
		type: "POST",
		url: "/getCalmapData",
		data: {
			"years": years,
			"months": months,
			"weeks": weeks,
			"southWest": southWest,
			"northEast": northEast
		},
		success: function(data) {
			regenerateCalmap(data)
			defer.resolve()
		},
		error: defer.reject
	})
	return defer.promise
}
