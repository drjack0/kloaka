import React, { Component } from "react";
import { Container, Nav } from "./styled-components";

import { CustomTable } from "./Custom-Table";

// LeafLet modules and CSS
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css';
import L from "leaflet";

// fusioncharts
import FusionCharts from "fusioncharts";
import Charts from "fusioncharts/fusioncharts.charts";
import ReactFC from "react-fusioncharts";
import "./charts-theme";

import config from "./config";
import Dropdown from "react-dropdown";

import UserImg from "../assets/images/user-img-placeholder.jpeg";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
})

const LeafIcon = L.Icon.extend({
  options: {}
});

const blueIcon = new LeafIcon({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"
});
const okIcon = new LeafIcon({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png"
})
const otherIcon = new LeafIcon({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png"
})
const obstructionIcon = new LeafIcon({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png"
})
const problemIcon = new LeafIcon({
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png"
})

ReactFC.fcRoot(FusionCharts, Charts);

const endpointAWS = "https://mo6thqx9bj.execute-api.us-east-1.amazonaws.com/"

class App extends Component {
  constructor() {
    super();
    this.state = {
      items: [],
      dropdownOptions: [],
      selectedValue: null,
      lastMes: null,
      lastMesDate: null,
      avgMes: null,
      maxMes: null,
      maxMesDate: null,
      minMes: null,
      minMesDate: null,
      problemsTotal: [],
      problemList: [],
      obstructionList: [],
      otherList: [],
      problem: "",
      problemRate: " ",
      problemNumber: 0,
      obstruction: "",
      obstructionRate: " ",
      obstructionNumber: 0,
      other: "",
      otherRate: " ",
      otherNumber: 0
    }
  }

  aggregatedValues = (listValues) => {
    let min = 10000;
    let minDate = 0;
    let max = -10000;
    let maxDate = 0;
    let sum = 0.0;
    listValues.map((value,key) => {
      var jsonValue = JSON.parse(value);
      console.log("JSON VALUE FOR LOOP ", jsonValue);
      if(parseInt(jsonValue.filling) > max){
        max = parseInt(jsonValue.filling);
        maxDate = jsonValue.dt;
      }
      if(parseInt(jsonValue.filling) < min){
        min = parseInt(jsonValue.filling);
        minDate = jsonValue.dt;
      }
      sum += parseInt(jsonValue.filling);
    });
    return {
      min: min,
      minDate: minDate,
      max: max,
      maxDate: maxDate,
      avg: sum / listValues.length
    }
  }

  getProblemAWS = arg => {
    const arr = this.state.problemsTotal;
    const arrLen = arr.length;

    let problemList = [];
    let obstructionList = [];
    let otherList = [];

    for(let i = 0; i < arrLen; i++){
      let selected = arr[i];
      if(selected.problem_status !== "SOLVED"){
        if(arg === arr[i].problem_id.substring(0,2)){
          let pushedObject = {
            otherSensor: selected.problem_id.substring(2,4),
            problemType: selected.problem,
            promblemStatus: selected.problem_status,
            problemTime: selected.problem_time,
            problemDescription: selected.problem_description
          }
          if(pushedObject.problemType === "PROBLEM"){
            problemList.push(pushedObject);
          } else if(pushedObject.problemType === "OBSTRUCTION"){
            obstructionList.push(pushedObject);
          } else {
            otherList.push(pushedObject);
          }
        }
        if(arg === arr[i].problem_id.substring(2,4)){
          let pushedObject = {
            otherSensor: selected.problem_id.substring(0,2),
            problemType: selected.problem,
            promblemStatus: selected.problem_status,
            problemTime: selected.problem_time,
            problemDescription: selected.problem_description
          }
          if(pushedObject.problemType === "PROBLEM"){
            problemList.push(pushedObject);
          } else if(pushedObject.problemType === "OBSTRUCTION"){
            obstructionList.push(pushedObject);
          } else {
            otherList.push(pushedObject);
          }
        }
      }
    }

    let problemRate = (problemList.length / this.state.problemsTotal.length) * 100;
    let obstructionRate = (obstructionList.length / this.state.problemsTotal.length) * 100;
    let otherRate = (otherList.length / this.state.problemsTotal.length) * 100;

    console.log("PROBLEM LIST "+ arg + " ", problemList);
    console.log("OBSTRUCTION LIST "+ arg + " ", obstructionList);
    console.log("OTHER LIST "+ arg + " ", otherList);
    console.log("RATINGS ", problemRate, obstructionRate, otherRate);
    
    this.setState({
      problemList: problemList,
      obstructionList: obstructionList,
      otherList: otherList,
      problemRate: problemRate,
      obstructionRate: obstructionRate,
      otherRate: otherRate,
      problemNumber: problemList.length,
      obstructionNumber: obstructionList.length,
      otherNumber: otherList.length
    })
  }

  getDataAWS = arg => {
    const arr = this.state.items;
    const arrLen = arr.length;
    let lastMes = 0.0;
    let lastMesDate = 0;
    let numMes = 0;
    let avgMes = 0.0;
    let maxMes = 0.0;
    let maxMesDate = 0;
    let minMes = 0.0;
    let minMesDate = 0;

    console.log("ARG ", arg);
    console.log("ITEMS ", arr);

    let selectedValue = null;

    for(let i = 0; i < arrLen; i++){
      if(arg === arr[i].id){
        lastMes = arr[i].last_value;
        lastMesDate = arr[i].last_update;
        numMes = arr[i].measurements.length;
        console.log("LAST MES FOR LOOP ", lastMes);
        console.log("MEASUREMENTS FOR LOOP ", arr[i].measurements);
        let aggregatedValues = this.aggregatedValues(arr[i].measurements);
        avgMes = aggregatedValues.avg;
        maxMes = aggregatedValues.max;
        maxMesDate = aggregatedValues.maxDate;
        minMes = aggregatedValues.min;
        minMesDate = aggregatedValues.minDate;
      }
    }

    selectedValue = arg;

    this.setState({
      lastMes: lastMes,
      lastMesDate: lastMesDate,
      numMes: numMes,
      avgMes: avgMes.toPrecision(3),
      maxMes: maxMes,
      maxMesDate: maxMesDate,
      minMes: minMes,
      minMesDate: minMesDate,
      selectedValue: selectedValue
    })
  }

  updateDashboard = event => {
    this.getDataAWS(event.value);
    this.getProblemAWS(event.value);
    this.setState({ selectedValue: event.value });
  };

  componentDidMount() {
    //Problem API fetch
    fetch(endpointAWS+"problem/scan")
      .then(response => response.json())
      .then(dataProblem => {
        let itemsProblem = null;
        itemsProblem = dataProblem.Items;
        this.setState({problemsTotal: itemsProblem}, () => this.getProblemAWS("01"))
      });

    //Data API fetch
    fetch(endpointAWS+"device/scan")
    .then(response => response.json())
    .then(data => {         
      let itemsData = data.Items;
      let dropID = [];
      for(let i = 0; i < data.Count; i++){
        dropID.push(itemsData[i].id);
      }
      dropID.sort();
      console.log("DROPDOWN MENU LIST", dropID);
      this.setState(
        {
          items: itemsData,
          dropdownOptions: dropID,
          selectedValue: dropID[0]
        },
        () => this.getDataAWS("01")
      );
    });
  }

  render() {
    function getDateTimestamp(timestamp){
      const dateObject = new Date(timestamp);
      return dateObject.toLocaleString("it-IT");
    };
    function functionTotalPinList(ptList,dtList){
      let pinList = [];
      for(let i = 0; i < dtList.length; i++){
        let pinListObject = {
          id: dtList[i].id,
          value: dtList[i].last_value,
          time: getDateTimestamp(dtList[i].last_update),
          error: "NO",
          errorWith: null,
          errorDescription: null,
          icon: okIcon
        }
        for(let k = 0; k < ptList.length; k++){
          if((ptList[k].problem_id.substring(0,2) === dtList[i].id || ptList[k].problem_id.substring(2,4) === dtList[i].id) && ptList[k].problem_status !== "SOLVED"){
            pinListObject.error = ptList[k].problem;
            pinListObject.errorDescription = ptList[k].problem_description;
            if(ptList[k].problem_id.substring(0,2) === dtList[i].id){
              pinListObject.errorWith = ptList[k].problem_id.substring(2,4);
            } else if(ptList[k].problem_id.substring(2,4) === dtList[i].id){
              pinListObject.errorWith = ptList[k].problem_id.substring(0,2);
            }
            
            if(pinListObject.error === "PROBLEM"){
              pinListObject.icon = problemIcon;
            } else if (pinListObject.error === "OBSTRUCTION"){
              pinListObject.icon = obstructionIcon;
            } else if (pinListObject.error === "OTHER"){
              pinListObject.icon = otherIcon;
            }
          }
        }
        pinList.push(pinListObject);
      }
      console.log("PIN LIST ", pinList);
      return pinList;
    }
    return (
      <Container>
        {/* static navbar - top */}
        <Nav className="navbar navbar-expand-lg fixed-top is-white is-dark-text">
          <Container className="navbar-brand h1 mb-0 text-large font-medium">
            Kloaka - Web Dashboard
          </Container>
          <Container className="navbar-nav ml-auto">
            <Container className="user-detail-section">
              <span className="pr-2">Hi, Kloaka User!</span>
              <span className="img-container">
                <img src={UserImg} className="rounded-circle" alt="user" />
              </span>
            </Container>
          </Container>
        </Nav>

        {/* static navbar - bottom */}
        <Nav className="navbar fixed-top nav-secondary is-dark is-light-text">
          <Container className="text-medium">Visualize Data of Selected Device</Container>
          <Container className="navbar-nav ml-auto">
            <Dropdown
              className="pr-2 custom-dropdown"
              options={this.state.dropdownOptions}
              onChange={this.updateDashboard}
              value={this.state.selectedValue}
              placeholder="Select a Device"
            />
          </Container>
        </Nav>

        {/* content area start */}
        <Container className="container-fluid pr-5 pl-5 pt-5 pb-5">
          {/* row 1 - Measurements */}
          <Container className="row">
            <Container className="col-lg-3 col-sm-6 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Last Flow Measurement
                  </Container>
                  <Container className="card-heading-brand">
                    <i className="far fa-clock text-large"></i>
                  </Container>
                </Container>

                <Container className="card-value pt-4 text-x-large">
                  {this.state.lastMes}
                  <span className="text-large pr-1">%</span>
                </Container>
                <Container className="card-value">
                  <span className="text-small pl-2 is-dark-text-light">date:{' '}{getDateTimestamp(this.state.lastMesDate)}</span>
                </Container>
              </Container>
            </Container>

            <Container className="col-lg-3 col-sm-6 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Average Flow
                  </Container>
                  <Container className="card-heading-brand">
                    <i className="fab fa-medium-m text-large"></i>
                  </Container>
                </Container>

                <Container className="card-value pt-4 text-x-large">
                  {this.state.avgMes}
                  <span className="text-large pr-1">%</span>
                </Container>
                <Container className="card-value">
                  <span className="text-small pl-2 is-dark-text-light">#measurements:{' '}{this.state.numMes}</span>
                </Container>
              </Container>
            </Container>

            <Container className="col-lg-3 col-sm-6 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Maximum Flow
                  </Container>
                  <Container className="card-heading-brand">
                  <i className="far fa-plus-square text-large"></i>
                  </Container>
                </Container>

                <Container className="card-value pt-4 text-x-large">
                  {this.state.maxMes}
                  <span className="text-large pr-1">%</span>
                </Container>
                <Container className="card-value">
                  <span className="text-small pl-2 is-dark-text-light">date:{' '}{getDateTimestamp(this.state.maxMesDate)}</span>
                </Container>
              </Container>
            </Container>

            <Container className="col-lg-3 col-sm-6 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Minimum Flow
                  </Container>
                  <Container className="card-heading-brand">
                    <i className="far fa-minus-square text-large"></i>
                  </Container>
                </Container>

                <Container className="card-value pt-4 text-x-large">
                  {this.state.minMes}
                  <span className="text-large pr-1">%</span>
                </Container>
                <Container className="card-value">
                  <span className="text-small pl-2 is-dark-text-light">date:{' '}{getDateTimestamp(this.state.minMesDate)}</span>
                </Container>
              </Container>
            </Container>
          </Container>

          {/* row 2 - Problems of SELECTED DEVICE*/}
          <Container className="row">
            <Container className="col-md-4 col-lg-3 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading mb-3">
                  <Container className="is-dark-text-light letter-spacing text-large">
                    Attentions for Device {this.state.selectedValue}
                  </Container>
                  <Container className="card-heading-brand">
                    <i className="fas fa-exclamation-triangle text-large"></i>
                  </Container>
                </Container>
                <Container className="card-value pt-4 text-large">
                  {this.state.problemNumber}                
                  <span className="text-medium pl-2 is-dark-text-light">{' '}problems detected</span>
                  <span className="text-medium pl-1 is-dark-text-light">
                    {this.state.problemList.length === 0 ? "" : "- last with device " + this.state.problemList[0].otherSensor}
                  </span>
                </Container>
                <Container className="card-value pt-4 text-large">
                  {this.state.obstructionNumber}  
                  <span className="text-medium pl-2 is-dark-text-light">{' '}obstructions detected</span>
                  <span className="text-medium pl-1 is-dark-text-light">
                    {this.state.obstructionList.length === 0 ? "" : "- last with device " + this.state.obstructionList[0].otherSensor}
                  </span>
                </Container>
                <Container className="card-value pt-4 text-large">
                  {this.state.otherNumber}  
                  <span className="text-medium pl-2 is-dark-text-light">{' '}other detected</span>
                  <span className="text-medium pl-1 is-dark-text-light">
                    {this.state.otherList.length === 0 ? "" : "- last with device " + this.state.otherList[0].otherSensor}
                  </span>
                </Container>
              </Container>
            </Container>

            <Container className="col-md-8 col-lg-9 is-light-text mb-4">
              <Container className="card is-card-dark chart-card">
                <Container className="row full-height">
                  <Container className="col-sm-4 full-height">
                    <Container className="chart-container full-height">
                      <ReactFC
                        {...{
                          type: "doughnut2d",
                          width: "100%",
                          height: "100%",
                          dataFormat: "json",
                          containerBackgroundOpacity: "0",
                          dataSource: {
                            chart: {
                              caption: "Problem Rate - Device " + `${this.state.selectedValue}`,
                              theme: "ecommerce",
                              defaultCenterLabel: `${this.state.problemRate}%`,
                              paletteColors: "#3B70C4, #000000"
                            },
                            data: [
                              {
                                label: "Problems",
                                value: `${this.state.problemRate}`,
                                aplha: 5
                              },
                              {
                                label: "Non Problems",
                                alpha: 5,
                                value: `${100 - this.state.problemRate}`
                              }
                            ]
                          }
                        }}
                      />
                    </Container>
                  </Container>
                  <Container className="col-sm-4 full-height border-left border-right">
                    <Container className="chart-container full-height">
                      <ReactFC
                        {...{
                          type: "doughnut2d",
                          width: "100%",
                          height: "100%",
                          dataFormat: "json",
                          containerBackgroundOpacity: "0",
                          dataSource: {
                            chart: {
                              caption: "Obstruction Rate - Device " + `${this.state.selectedValue}`,
                              theme: "ecommerce",
                              defaultCenterLabel: `${this.state.obstructionRate}%`,
                              paletteColors: "#41B6C4, #000000"
                            },
                            data: [
                              {
                                label: "Obstructions",
                                value: `${this.state.obstructionRate}`
                              },
                              {
                                label: "Non Obstructions",
                                alpha: 5,
                                value: `${100 - this.state.obstructionRate}`
                              }
                            ]
                          }
                        }}
                      />
                    </Container>
                  </Container>
                  <Container className="col-sm-4 full-height">
                    <Container className="chart-container full-height">
                      <ReactFC
                        {...{
                          type: "doughnut2d",
                          width: "100%",
                          height: "100%",
                          dataFormat: "json",
                          containerBackgroundOpacity: "0",
                          dataSource: {
                            chart: {
                              caption: "Other Rate - Device " + `${this.state.selectedValue}`,
                              theme: "ecommerce",
                              defaultCenterLabel: `${this.state.otherRate}%`,
                              paletteColors: "#EDF8B1, #000000"
                            },
                            data: [
                              {
                                label: "Others",
                                value: `${this.state.otherRate}`
                              },
                              {
                                label: "Non Others",
                                alpha: 5,
                                value: `${100 - this.state.otherRate}`
                              }
                            ]
                          }
                        }}
                      />
                    </Container>
                  </Container>
                </Container>
              </Container>
            </Container>
          </Container>

          {/* row 3 - Problems List TOTAL*/}
          <Container className="row">
            <Container className="col-lg-4 col-sm-6 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Problems List - Total
                  </Container>
                  <Container className="card-heading-brand">
                    <i className="fas fa-exclamation-circle text-large"></i>
                  </Container>
                </Container>

                <Container className="card-value pt-4">
                  <CustomTable type = {"PROBLEMS"} data={this.state.problemsTotal}></CustomTable>
                </Container>
              </Container>
            </Container>

            <Container className="col-lg-4 col-sm-6 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Obstructions List - Total
                  </Container>
                  <Container className="card-heading-brand">
                  <i className="far fa-stop-circle text-large"></i>
                  </Container>
                </Container>

                <Container className="card-value pt-4">
                  <CustomTable type = {"OBSTRUCTIONS"} data={this.state.problemsTotal}></CustomTable>
                </Container>
              </Container>
            </Container>

            <Container className="col-lg-4 col-sm-6 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Other List - Total
                  </Container>
                  <Container className="card-heading-brand">
                    <i className="far fa-question-circle text-large"></i>
                  </Container>
                </Container>

                <Container className="card-value pt-4">
                  <CustomTable type = {"OTHERS"} data={this.state.problemsTotal}></CustomTable>
                </Container>
              </Container>
            </Container>
          </Container>

          <Container className="row" style={{minHeight: "400px"}}>
            <Container className="col-lg-12 col-sm-12 is-light-text mb-4">
              <Container className="card grid-card is-card-dark">
                <Container className="card-heading">
                  <Container className="is-dark-text-light letter-spacing text-medium">
                    Device Positioning
                  </Container>
                  <Container className="card-heading-brand">
                    <i className="fas fa-map-marker-alt text-x-large"></i>
                  </Container>
                </Container>

                
                <Container className="card-value pt-4">
                  <MapContainer center={[41.902782, 12.496366]} zoom={16} scroolWheelZoom={false}>
                    <TileLayer
                      attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {functionTotalPinList(this.state.problemsTotal,this.state.items).map((elem,key) => {
                      return (
                        <Marker
                          position={[41.902782 + (key/1000), 12.496366]}
                          icon={elem.icon}
                          key={key}
                        >
                          <Popup>
                            {"DEVICE " + elem.id}
                            <br />
                            {"Last flow value: " + elem.value + "%"}
                            <br />
                            {"[measured at: " + elem.time + "]"}
                            {elem.error === "NO" ? "" : <hr />}
                            {(elem.error === "NO" ? "" : "Problem: " + elem.error + " with device " + elem.errorWith)}
                            <br />
                            {(elem.error === "NO" ? "" : "Description: " + elem.errorDescription)}
                          </Popup>
                        </Marker>
                      )
                    })}
                  </MapContainer>
                </Container>
                
              </Container>
            </Container>
          </Container>
        </Container>
        {/* content area end */}
      </Container>
    );
  }
}

export default App;
