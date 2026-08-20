Imports System.Data.SqlClient
Public Class frmRptCollegeDiscSummary

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct AcdYear From AcdYear", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcdYear.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub frmRptDisc_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillAcdYear()

    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter("SELECT [College],[Batch],[AcdYear] ,stdcount " & _
                                          ",[payPerc],[MainFees] ,[discount] FROM [RebatUniv].[dbo].[viewDiscountSummary]" & _
                                           "where  AcdYear=N'" & _
                                          Me.CombAcdYear.SelectedItem & "'  Order by payPerc Desc", cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()

            dap.Fill(das, "viewDiscountSummary")
            cnn.Close()

            Dim rpt As New rptDiscSummary
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub
End Class