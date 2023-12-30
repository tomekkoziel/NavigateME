// Inicjalizacja mapy
let map;

// Tablica znaczników
let markers = []

// Iterator okreslający ID znaczników
let iterator = 0

var display;

async function initMap() {
    markers = []

    const position = { lat: 50.049, lng: 19.944 };

    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const geocoder = new google.maps.Geocoder();

    display = new google.maps.DirectionsRenderer();

    // Mapa jest początkowo wyśrodkowana na Kraków
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: position,
    });

    map.addListener("click", (e) => {
        addMarker(e.latLng, geocoder);
    });

    // Stworzenie elementu SearchBox oraz przypisanie go do elementu z UI.
    const input = document.getElementById("pac-input");
    const searchBox = new google.maps.places.SearchBox(input);

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener("places_changed", () => {
        handlePlacesChanged(searchBox, map);
    });

    document
        .getElementById("show-markers")
        .addEventListener("click", showMarkers);
    document
        .getElementById("hide-markers")
        .addEventListener("click", hideMarkers);
    document
        .getElementById("delete-all-markers")
        .addEventListener("click", deleteAllMarkers);
    document
        .getElementById("calculate-road")
        .addEventListener("click", calculateRoute);
    document
        .getElementById("delete-selected-markers")
        .addEventListener("click", deleteSelectedMarkers);
}

function addMarker(position, geocoder) {
    const latlng = {
        lat: parseFloat(position.lat()),
        lng: parseFloat(position.lng()),
    };

    if (markers.length <= 9) {
        var tmpLat = position.lat().toFixed(3);
        var tmpLng = position.lng().toFixed(3);
        let LatLngString = [];

        // Używam Geocoding API w celu odszyfrowania adrersu miasta za pomocą współrzędnych 
        geocoder
            .geocode({ location: latlng })
            .then((response) => {

                if (response.results[0]) {
                    LatLngString.push(response.results[0].formatted_address);
                } else {
                    LatLngString.push("Szerokość: " + tmpLat + " Długość: " + tmpLng);
                }

                // Tworzymy znacznik wewnątrz obiektu geocoding ponieważ działa on asynchronicznie
                const marker = new google.maps.Marker({
                    position,
                    map,

                    // ID znacznika
                    marker_id: iterator,
                    title: LatLngString.toString(),
                });
                iterator++;

                markers.push(marker);

                generateMarkerTable();
                visibilityOfButtons();
            })
            .catch((e) => window.alert("Geocoder failed due to: " + e));
    } else {
        alert("Możliwe jest ustawienie jedynie 10 znaczników na mapie.");

    }
}

function handlePlacesChanged(searchBox, map) {
    const places = searchBox.getPlaces();

    if (places.length == 0) {
        return;
    }

    const bounds = new google.maps.LatLngBounds();

    places.forEach((place) => {
        if (!place.geometry || !place.geometry.location) {
            console.log("Returned place contains no geometry");
            return;
        }

        // Tworzenie znacznika dla każdego wyszukanego miejsca
        markers.push(
            new google.maps.Marker({
                map,
                title: place.name,
                position: place.geometry.location,

                // ID znacznika
                marker_id: iterator,
            }),
        );
        iterator++;

        generateMarkerTable();
        visibilityOfButtons();

        if (place.geometry.viewport) {
            // Tylko obiekty geocodes posiadaja viewport
            bounds.union(place.geometry.viewport);
        } else {
            bounds.extend(place.geometry.location);
        }
    });
    map.fitBounds(bounds);
}

function setMapOnAll(map) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

// Usunięcie wszystkich znaczników z mapy, brak zmian w tablicy markers
function hideMarkers() {
    setMapOnAll(null);
}

// Pokazanie wszystkich znaczników w tablicy
function showMarkers() {
    setMapOnAll(map);
}

// Usunięcie wszystkich znaczników z tabicy
function deleteAllMarkers() {
    hideMarkers();
    markers = [];
    iterator = 0;

    display.set('directions', null);

    generateMarkerTable();
    visibilityOfButtons();
    deleteRouteDetails();
}

function generateMarkerTable() {
    const tableContainer = document.getElementById("marker-table");
    if (!tableContainer) return;

    let tableHTML = '<tbody><thead><tr><th>ID</th><th>Szerokość Geograficzna</th><th>Długość Geograficzna</th><th>Nazwa Miejsca</th></tr></thead>';

    markers.forEach((marker) => {
        const position = marker.getPosition();
        const lat = position.lat().toFixed(3);
        const lng = position.lng().toFixed(3);
        let name;
        const id = marker.marker_id;

        // console.log(marker.place.name);

        if (marker.place) {
            name = marker.place.name;
        } else {
            name = marker.title;
        }

        tableHTML += `<tr><td><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" id="${id}"><label class="custom-control-label" for="${id}">${id}</label></div></td><td>${lat}</td><td>${lng}</td><td>${name}</td></tr>`;
    });

    tableHTML += '</tbody>';

    tableContainer.innerHTML = tableHTML;
}

// Funkcja włączająca lub wyłączająca przycisk "Wyznacz trasę" - stworzona w celu wyeliminowania obliczania trasy bez znaczników na mapie
function visibilityOfButtons() {
    const calculateRoadButton = document.getElementById('calculate-road');
    const deleteSelectedMarkersButton = document.getElementById('delete-selected-markers');

    if (markers.length == 0 && calculateRoadButton.disabled == false) {
        calculateRoadButton.disabled = true;
        deleteSelectedMarkersButton.disabled = true;
    }

    if (markers.length != 0 && calculateRoadButton.disabled == true) {
        calculateRoadButton.disabled = false;
        deleteSelectedMarkersButton.disabled = false;
    }
}

function calculateRoute() {
    // Warunek sprawdzający czy na mapie są umieszczone znaczniki
    if (markers.length == 0) {
        alert("No markers selected.")
    }

    // Usunięcie oryginalnych znaczników z mapy, podczas wyznaczania tras pojawiają się osobne znaczniki z oznaczeniem kolejności odwiedzania.
    hideMarkers();

    // Assuming the select element has an id of "transport-type"
    const selectElement = document.getElementById("transport-type");

    // Get the selected value
    const selectedTransport = selectElement.value;

    // Use the selected value in your logic, for example, log it to the console
    console.log("Selected Transport:", selectedTransport);

    display.set('directions', null);

    const service = new google.maps.DistanceMatrixService();

    // const originLocation = { lat: markers[0].getPosition().lat(), lng: markers[0].getPosition().lng() };
    // Obliczanie maierzy odleglosci dla kazdego punktu w celu stworzenia macierzy, zmiana podejscia - poczatkowo obliczana byla wartosc jedynie dla punktu startowego (pierwszego znacznika)
    const originsLocation = []
    const destinationLocations = []

    for (let i = 0; i < markers.length; i++) {
        originsLocation.push({ lat: markers[i].getPosition().lat(), lng: markers[i].getPosition().lng() });
        destinationLocations.push({ lat: markers[i].getPosition().lat(), lng: markers[i].getPosition().lng() });
    }

    const request = {
        origins: originsLocation,
        destinations: destinationLocations,
        travelMode: selectedTransport,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
    };

    let matrix;

    // request
    // console.log(JSON.stringify(request, null, 2));
    // response
    service.getDistanceMatrix(request).then((response) => {
        // console.log(JSON.stringify(response, null, 2));

        if (response && response.rows) {
            // Umieszczenie danych o odległości i czasie potrzebnym do dotarcia do markerów w macierzy (value - informacje w metrach i sekundach, text - informacje zaokrąglone do większych jednostek, np. kilometry i godziny)
            matrix = response.rows.map(row =>
                row.elements.map(element => [element.distance.value, element.duration.value, element.distance.text, element.duration.text])
            );


            // Informację o czasie potrzebnym do dotarcia do celu uzyskujemy w nastepujący sposób matrix["origin marker"]["destination marker"][1]
            // Przykład poniżej: czas potrzebny na dotarcie z 0 punktu do 1 w sekundach
            console.log(matrix);
            // console.log(matrix[0][1][1]);

            // Wyznaczanie planu podróży za pomocą algorytmu najbliższego sąsiada
            const route = nearestNeighbourAlgorith(matrix);
            console.log('Fastest route: ', route);


            var services = new google.maps.DirectionsService();

            let routeLastIndex = route[route.length - 1];
            const start = new google.maps.LatLng(markers[0].getPosition().lat(), markers[0].getPosition().lng());
            const end = new google.maps.LatLng(markers[routeLastIndex].getPosition().lat(), markers[routeLastIndex].getPosition().lng());
            var waypointsArray = [];

            // Pętla for dodająca znaczniki do tablicy waypointsArray
            for (let i = 1; i < route.length - 1; i++) {
                let j = route[i];
                waypointsArray.push({ location: new google.maps.LatLng(markers[j].getPosition().lat(), markers[j].getPosition().lng()), stopover: true });
            }

            var request = {
                origin: start,
                destination: end,
                waypoints: waypointsArray,
                travelMode: selectedTransport,
            };
            services.route(request, function (result, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                    display.setDirections(result);
                    display.setMap(map);

                    generateRouteDetails(route, matrix);
                } else {
                    console.error("Directions Request from " + start.toUrlValue(6) + " to " + end.toUrlValue(6) + " failed: " + status);
                }
            });
        } else {
            console.error("Invalid response structure");
        }
    });
}

function nearestNeighbourAlgorith(graph) {
    const length = graph.length;

    const visitedNodes = new Array(length).fill(false);

    let currentNode = 0;
    visitedNodes[currentNode] = true;

    const path = [currentNode];

    for (let i = 1; i < length; i++) {
        let nearestNode = null;
        let shortestDistance = Number.MAX_VALUE;

        for (let j = 0; j < length; j++) {
            if (!visitedNodes[j] && graph[currentNode][j][1] < shortestDistance) {
                nearestNode = j;
                shortestDistance = graph[currentNode][j][1];
            }
        }

        visitedNodes[nearestNode] = true;

        currentNode = nearestNode;

        path.push(currentNode);
    }

    return path;
}

function generateRouteDetails(route, matrix) {
    const textContainer = document.getElementById("route-details");
    if (!textContainer) return;

    let finDist = 0;
    let finDur = 0;

    let textHTML = `<div class="justify-content-center mt-3"><h1>Kolejne kroki podróży:</h1>`;

    for (let i = 0; i < route.length - 1; i++) {
        let firstIndex = route[i];
        let secondIndex = route[i + 1];
        const startCharCode = 'A'.charCodeAt(0);

        finDur += matrix[firstIndex][secondIndex][1];
        finDist += matrix[firstIndex][secondIndex][0];

        const duration = matrix[firstIndex][secondIndex][3];
        const distance = matrix[firstIndex][secondIndex][2];
        let origin, dest;

        if (markers[firstIndex].place) {
            origin = markers[firstIndex].place.name;
        } else {
            origin = markers[firstIndex].title;
        }

        if (markers[secondIndex].place) {
            dest = markers[secondIndex].place.name;
        } else {
            dest = markers[secondIndex].title;
        }

        const originChar = String.fromCharCode(startCharCode + i);
        const destinationChar = String.fromCharCode(startCharCode + i + 1);

        textHTML += `<p>Udaj się z ${originChar} - ${origin} do ${destinationChar} - ${dest}, podróż zajmie ${duration}, łącznie pokonasz ${distance}.</p>`;
    }

    const hours = Math.floor(finDur / 3600);
    const remainingSeconds = finDur % 3600;
    const minutes = Math.floor(remainingSeconds / 60);

    let hoursText = ``;

    if (hours != 0) {
        hoursText += `${hours} godzin i `
    }

    finDist /= 1000;
    finDist = finDist.toFixed(1);

    textHTML += `<p>Podróż łącznie zajmie ${hoursText}${minutes} minut, w sumie zostanie pokonanych ${finDist} km.</p>`;
    textHTML += `</div>`;

    textContainer.innerHTML = textHTML;
}

function deleteRouteDetails() {
    const textContainer = document.getElementById("route-details");
    if (!textContainer) return;

    let textHTML = ``;

    textContainer.innerHTML = textHTML;
}

function deleteSelectedMarkers() {
    const checkboxes = document.querySelectorAll('.custom-control-input');

    // Array to store IDs of selected markers
    const selectedMarkerIds = [];

    checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
            // Extract marker ID from checkbox ID
            const markerId = parseInt(checkbox.id, 10);
            selectedMarkerIds.push(markerId);

            const markerIndex = markers.findIndex((marker) => marker.marker_id === markerId);
            if (markerIndex !== -1) {
                markers[markerIndex].setMap(null); // Remove the marker from the map
            }
        }
    });

    // Filter out selected markers from the markers array
    markers = markers.filter((marker) => !selectedMarkerIds.includes(marker.marker_id));

    // Refresh the marker table
    generateMarkerTable();
}

window.initMap = initMap;