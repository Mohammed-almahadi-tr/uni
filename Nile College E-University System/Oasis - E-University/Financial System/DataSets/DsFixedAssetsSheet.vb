Partial Class DsFixedAssetsSheet
    Partial Class FixedAssetsDataTable

      

        Private Sub FixedAssetsDataTable_ColumnChanging(ByVal sender As System.Object, ByVal e As System.Data.DataColumnChangeEventArgs) Handles Me.ColumnChanging
            If (e.Column.ColumnName = Me.CategoryColumn.ColumnName) Then
                'Add user code here
            End If

        End Sub

    End Class

End Class
