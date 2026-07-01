import Link from "next/link"
import { Apple, Heart, Search, ShoppingCart } from "lucide-react"

import {
  addRecipeToMealPlanAction,
  addRecipeToShoppingListAction,
  saveRecipeAction,
  updateShoppingListAction,
} from "@/lib/actions"
import { getCurrentProfile } from "@/lib/auth"
import { getRecipePlanning, getRecipes } from "@/lib/data"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type RecipesPageProps = {
  searchParams?: Promise<{ recipe?: string; category?: string; diet?: string; filters?: string; q?: string }>
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const profile = await getCurrentProfile("client")
  const recipes = await getRecipes(profile)
  const { mealPlanItems, shoppingListItems } = await getRecipePlanning(profile, recipes)
  const params = await searchParams
  const selectedRecipe = recipes.find((recipe) => recipe.id === params?.recipe)
  const searchTerm = (params?.q ?? "").trim().toLowerCase()
  const categoryFilter = params?.category && params.category !== "all" ? params.category.toLowerCase() : ""
  const dietFilter = params?.diet && params.diet !== "all" ? params.diet.toLowerCase() : ""
  const quickFilter = params?.filters && params.filters !== "open" ? params.filters : ""
  const activeFilter = params?.category || params?.diet || params?.filters || params?.q
  const filteredRecipes = recipes.filter((recipe) => {
    const searchableValues = [
      recipe.title,
      recipe.description,
      recipe.mealType,
      recipe.difficulty,
      ...recipe.dietaryTags,
      ...recipe.ingredients,
    ]
    const matchesSearch = !searchTerm || searchableValues.some((value) => value.toLowerCase().includes(searchTerm))
    const matchesCategory = !categoryFilter || recipe.mealType.toLowerCase() === categoryFilter
    const matchesDiet = !dietFilter || recipe.dietaryTags.some((tag) => tag.toLowerCase() === dietFilter)
    const matchesQuickFilter =
      !quickFilter ||
      (quickFilter === "high-protein" && recipe.protein >= 30) ||
      (quickFilter === "quick" && recipe.prepMinutes + recipe.cookMinutes <= 30) ||
      (quickFilter === "easy" && recipe.difficulty.toLowerCase() === "easy")

    return matchesSearch && matchesCategory && matchesDiet && matchesQuickFilter
  })
  const visibleRecipes = selectedRecipe
    ? [selectedRecipe, ...filteredRecipes.filter((recipe) => recipe.id !== selectedRecipe.id)]
    : filteredRecipes

  return (
    <AppShell profile={profile}>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Recipes"
          description="Browse balanced recipes, save favorites, and add meals to your week."
          actions={
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline"><ShoppingCart className="size-4" /> Shopping List</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Shopping List</SheetTitle>
                  <SheetDescription>Ingredients added from your recipe plan.</SheetDescription>
                </SheetHeader>
                <form action={updateShoppingListAction} className="mt-6 space-y-3">
                  {shoppingListItems.map((item) => (
                    <Label key={item.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                      <Checkbox name="shoppingItem" value={item.id} defaultChecked={item.checked} />
                      <span>
                        {item.label}
                        {item.recipeTitle && (
                          <span className="block text-xs text-muted-foreground">{item.recipeTitle}</span>
                        )}
                      </span>
                    </Label>
                  ))}
                  {shoppingListItems.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add recipe ingredients to build your shopping list.
                    </p>
                  )}
                  {shoppingListItems.length > 0 && (
                    <Button type="submit" className="w-full">Save Shopping List</Button>
                  )}
                </form>
              </SheetContent>
            </Sheet>
          }
        />
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_repeat(3,180px)]">
            <div className="relative">
              <form action="/recipes" className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input name="q" defaultValue={params?.q ?? ""} className="pl-9" placeholder="Search recipes..." />
                </div>
                <Button type="submit" variant="outline">Search</Button>
              </form>
            </div>
            <Button variant="outline" asChild><Link href="/recipes">All Recipes</Link></Button>
            <Button variant="outline" asChild><Link href="/recipes?filters=high-protein">High Protein</Link></Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">More Filters</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Recipe Filters</SheetTitle>
                  <SheetDescription>Choose a meal type, diet tag, or quick filter.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Meal type</p>
                    <div className="flex flex-wrap gap-2">
                      {["Breakfast", "Lunch", "Dinner", "Snack"].map((filter) => (
                        <Button key={filter} variant="outline" size="sm" asChild>
                          <Link href={`/recipes?category=${encodeURIComponent(filter)}`}>{filter}</Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Diet tag</p>
                    <div className="flex flex-wrap gap-2">
                      {["High Protein", "Gluten-free", "Dairy-free", "Vegetarian"].map((filter) => (
                        <Button key={filter} variant="outline" size="sm" asChild>
                          <Link href={`/recipes?diet=${encodeURIComponent(filter)}`}>{filter}</Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Quick filters</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild><Link href="/recipes?filters=quick">30 minutes or less</Link></Button>
                      <Button variant="outline" size="sm" asChild><Link href="/recipes?filters=easy">Easy</Link></Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
        {(selectedRecipe || activeFilter) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">
                  {selectedRecipe ? `Selected recipe: ${selectedRecipe.title}` : "Recipe filters"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedRecipe
                    ? "The selected recipe is shown first in the library."
                    : searchTerm
                      ? `Showing recipes matching "${params?.q}".`
                      : `Showing ${visibleRecipes.length} matching recipe${visibleRecipes.length === 1 ? "" : "s"}.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryFilter && <Badge variant="secondary">Meal: {params?.category}</Badge>}
                {dietFilter && <Badge variant="secondary">Diet: {params?.diet}</Badge>}
                {quickFilter && <Badge variant="secondary">{quickFilter === "quick" ? "30 minutes or less" : quickFilter}</Badge>}
                <Button asChild variant="outline" size="sm"><Link href="/recipes">Clear</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleRecipes.map((recipe) => (
              <Card key={recipe.id} className={`overflow-hidden ${selectedRecipe?.id === recipe.id ? "border-primary/50" : ""}`}>
                <div className="food-band h-40" />
                <CardHeader>
                  <div className="flex justify-between gap-3">
                    <Badge>{recipe.dietaryTags[0]}</Badge>
                    <form action={saveRecipeAction}>
                      <input type="hidden" name="recipeId" value={recipe.id} />
                      <Button type="submit" variant="outline" size="icon">
                        <Heart className="size-4" />
                        <span className="sr-only">Save</span>
                      </Button>
                    </form>
                  </div>
                  <CardTitle>{recipe.title}</CardTitle>
                  <CardDescription>{recipe.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-md border p-2"><b>{recipe.protein}g</b><span className="block text-muted-foreground">Protein</span></div>
                    <div className="rounded-md border p-2"><b>{recipe.carbs}g</b><span className="block text-muted-foreground">Carbs</span></div>
                    <div className="rounded-md border p-2"><b>{recipe.fat}g</b><span className="block text-muted-foreground">Fat</span></div>
                    <div className="rounded-md border p-2"><b>{recipe.calories}</b><span className="block text-muted-foreground">Cal</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recipe.dietaryTags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full">View Recipe</Button>
                    </SheetTrigger>
                    <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                      <SheetHeader>
                        <SheetTitle>{recipe.title}</SheetTitle>
                        <SheetDescription>{recipe.description}</SheetDescription>
                      </SheetHeader>
                      <Tabs defaultValue="overview" className="mt-6">
                        <TabsList>
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                          <TabsTrigger value="steps">Steps</TabsTrigger>
                          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="space-y-4 pt-4">
                          <p>{recipe.description}</p>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{recipe.prepMinutes + recipe.cookMinutes} min</Badge>
                            <Badge variant="secondary">{recipe.difficulty}</Badge>
                            <Badge variant="secondary">{recipe.servings} serving</Badge>
                          </div>
                        </TabsContent>
                        <TabsContent value="ingredients" className="pt-4">
                          <ul className="list-disc space-y-2 pl-5">{recipe.ingredients.map((item) => <li key={item}>{item}</li>)}</ul>
                        </TabsContent>
                        <TabsContent value="steps" className="pt-4">
                          <ol className="list-decimal space-y-2 pl-5">{recipe.steps.map((item) => <li key={item}>{item}</li>)}</ol>
                        </TabsContent>
                        <TabsContent value="nutrition" className="pt-4">
                          <p>{recipe.protein}g protein · {recipe.carbs}g carbs · {recipe.fat}g fat · {recipe.calories} calories</p>
                        </TabsContent>
                      </Tabs>
                      <div className="mt-6 grid gap-3">
                        <form action={addRecipeToMealPlanAction}>
                          <input type="hidden" name="recipeId" value={recipe.id} />
                          <Button type="submit" className="w-full"><Apple className="size-4" /> Add to Meal Plan</Button>
                        </form>
                        <form action={addRecipeToShoppingListAction}>
                          <input type="hidden" name="recipeId" value={recipe.id} />
                          <input type="hidden" name="label" value={`${recipe.title} ingredients`} />
                          <Button type="submit" variant="outline" className="w-full"><ShoppingCart className="size-4" /> Add to Shopping List</Button>
                        </form>
                      </div>
                    </SheetContent>
                  </Sheet>
                </CardContent>
              </Card>
            ))}
            {visibleRecipes.length === 0 && (
              <Card className="md:col-span-2 xl:col-span-3">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No recipes match that search yet.
                </CardContent>
              </Card>
            )}
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meal Plan</CardTitle>
                <CardDescription>This week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mealPlanItems.slice(0, 2).map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.mealSlot} · {item.mealType}</p>
                  </div>
                ))}
                {mealPlanItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Meals appear here after you add recipes to your meal plan.
                  </p>
                )}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">View Full Meal Plan</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Full Meal Plan</SheetTitle>
                      <SheetDescription>This week&apos;s selected meals.</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-3">
                      {mealPlanItems.map((item) => (
                        <div key={item.id} className="rounded-md border p-3">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.mealDate} · {item.mealSlot} · {item.calories} calories
                          </p>
                        </div>
                      ))}
                      {mealPlanItems.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Add a recipe to your meal plan to see it here.
                        </p>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Shopping List</CardTitle>
                <CardDescription>Add ingredients from your recipes.</CardDescription>
              </CardHeader>
              <CardContent>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full"><ShoppingCart className="size-4" /> Go to Shopping List</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Shopping List</SheetTitle>
                      <SheetDescription>Check items as you shop.</SheetDescription>
                    </SheetHeader>
                    <form action={updateShoppingListAction} className="mt-6 space-y-3">
                      {shoppingListItems.map((item) => (
                        <Label key={item.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                          <Checkbox name="shoppingItem" value={item.id} defaultChecked={item.checked} />
                          <span>
                            {item.label}
                            {item.recipeTitle && (
                              <span className="block text-xs text-muted-foreground">{item.recipeTitle}</span>
                            )}
                          </span>
                        </Label>
                      ))}
                      {shoppingListItems.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Add recipe ingredients to build your shopping list.
                        </p>
                      )}
                      {shoppingListItems.length > 0 && (
                        <Button type="submit" className="w-full">Save Shopping List</Button>
                      )}
                    </form>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
