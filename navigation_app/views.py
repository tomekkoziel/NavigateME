from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
# import folium

def index_view(request):
    template = loader.get_template('index.html')
    return HttpResponse(template.render())

def about_view(request):
    template = loader.get_template('about.html')
    return HttpResponse(template.render())

def show_route_view(request):
    template = loader.get_template('show_route.html')
    return HttpResponse(template.render())